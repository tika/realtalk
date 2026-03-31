import { os } from "@orpc/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { match } from "ts-pattern";
import * as z from "zod";

import { db } from "#/db";
import { errorInstance, languageItem, recording } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";
import { analyzeTranscript, transcribeAudioFromUrl } from "#/lib/ai";
import { logError, logInfo } from "#/lib/observability";
import { prompts } from "#/lib/prompts";
import { getPresignedDownloadUrl } from "#/lib/s3";
import {
  buildNumberedTranscript,
  getTranscriptWordRange,
  transcriptWordSchema,
} from "#/lib/transcript";
import type { TranscriptAnalysisError } from "#/lib/transcript-analysis";

interface ResolvedTranscriptAnalysisError extends TranscriptAnalysisError {
  endTimeMs: number;
  startTimeMs: number;
}

interface RecordingAnalysisPayload {
  errors: ResolvedTranscriptAnalysisError[];
  transcript: string;
  timestamps: z.infer<typeof transcriptWordSchema>[];
}

const resolveAudioUrl = async (audioKey: string): Promise<string> => {
  const urlResult = await getPresignedDownloadUrl(audioKey);

  return match(urlResult)
    .with({ success: true }, ({ data }) => data)
    .with({ success: false }, ({ error }) => {
      throw new Error(`Failed to resolve audio URL: ${error.message}`);
    })
    .exhaustive();
};

const getRecordingAnalysisPayload = async (
  audioKey: string
): Promise<RecordingAnalysisPayload> => {
  logInfo("recording-analysis.start", {
    audioKey,
  });
  const audioUrl = await resolveAudioUrl(audioKey);
  const transcriptionResult = await transcribeAudioFromUrl(audioUrl);
  const transcription = match(transcriptionResult)
    .with({ success: true }, ({ data }) => data)
    .with({ success: false }, ({ error }) => {
      logError("recording-analysis.transcription-failed", {
        audioUrl,
        error,
      });
      throw new Error(`Recording transcription failed: ${error.message}`);
    })
    .exhaustive();

  const transcript = transcription.text;
  const timestamps = z.array(transcriptWordSchema).parse(transcription.words);
  const numberedTranscript = buildNumberedTranscript(timestamps);
  logInfo("recording-analysis.transcription-ready", {
    audioUrl,
    transcriptLength: transcript.length,
    wordCount: timestamps.length,
  });
  const transcriptAnalysisResult = await analyzeTranscript(
    prompts.findErrors(`Transcript: "${numberedTranscript}"`)
  );
  const transcriptAnalysis = match(transcriptAnalysisResult)
    .with({ success: true }, ({ data }) => data)
    .with({ success: false }, ({ error }) => {
      logError("recording-analysis.model-failed", {
        audioUrl,
        error,
      });
      throw new Error(`Recording analysis failed: ${error.message}`);
    })
    .exhaustive();
  const resolvedErrors = transcriptAnalysis.errors.map((analysisError) => {
    const { end, start } = getTranscriptWordRange(
      timestamps,
      analysisError.word_start,
      analysisError.word_end
    );

    return {
      ...analysisError,
      endTimeMs: end,
      startTimeMs: start,
    };
  });

  logInfo("recording-analysis.success", {
    audioUrl,
    errorCount: resolvedErrors.length,
  });

  return {
    errors: resolvedErrors,
    transcript,
    timestamps,
  };
};

const replaceRecordingAnalysis = async (
  recordingId: string,
  analysis: RecordingAnalysisPayload
) => {
  const existingRecordingErrors = await db
    .select({
      id: errorInstance.id,
      languageItemId: errorInstance.languageItemId,
    })
    .from(errorInstance)
    .where(
      and(eq(errorInstance.storyId, recordingId), notDeleted(errorInstance))
    );

  const languageItemIds = existingRecordingErrors.flatMap(
    ({ languageItemId }) => (languageItemId ? [languageItemId] : [])
  );

  return await db.transaction(async (tx) => {
    if (existingRecordingErrors.length > 0) {
      await tx.delete(errorInstance).where(
        inArray(
          errorInstance.id,
          existingRecordingErrors.map(({ id }) => id)
        )
      );
    }

    if (languageItemIds.length > 0) {
      const activeReferences = await tx
        .selectDistinct({ languageItemId: errorInstance.languageItemId })
        .from(errorInstance)
        .where(inArray(errorInstance.languageItemId, languageItemIds));

      const activeLanguageItemIds = new Set(
        activeReferences.flatMap(({ languageItemId }) =>
          languageItemId ? [languageItemId] : []
        )
      );

      const orphanedLanguageItemIds = languageItemIds.filter(
        (languageItemId) => !activeLanguageItemIds.has(languageItemId)
      );

      if (orphanedLanguageItemIds.length > 0) {
        await tx
          .delete(languageItem)
          .where(inArray(languageItem.id, orphanedLanguageItemIds));
      }
    }

    const [updatedRecording] = await tx
      .update(recording)
      .set({
        timestamps: analysis.timestamps,
        transcript: analysis.transcript,
        updatedAt: new Date(),
      })
      .where(eq(recording.id, recordingId))
      .returning();

    if (!updatedRecording) {
      throw new Error("Recording not found");
    }

    for (const analysisError of analysis.errors) {
      const [createdLanguageItem] = await tx
        .insert(languageItem)
        .values({
          nativeText: analysisError.language_item.native_text,
          purpose: analysisError.language_item.purpose,
          targetText: analysisError.language_item.target_text,
          type: analysisError.language_item.type,
        })
        .returning();

      await tx.insert(errorInstance).values({
        context: analysisError.context,
        corrected_text: analysisError.corrected_text,
        endTimeMs: analysisError.endTimeMs,
        errorType: analysisError.type,
        languageItemId: createdLanguageItem.id,
        rating: analysisError.rating,
        original_text: analysisError.original_text,
        startTimeMs: analysisError.startTimeMs,
        storyId: recordingId,
      });
    }

    return updatedRecording;
  });
};

// return a list of all recordings
// input: nothing
// output: array of recording objects straight from db
const withResolvedAudioUrl = async <T extends { audioKey: string }>(
  record: T
): Promise<T & { audioUrl: string }> => {
  const audioUrl = await resolveAudioUrl(record.audioKey);
  return { ...record, audioUrl };
};

export const getAllRecordings = os.input(z.object({})).handler(async () => {
  const rows = await db.select().from(recording).where(notDeleted(recording));
  return await Promise.all(rows.map(withResolvedAudioUrl));
});

// return a single recording by id
// input: recording id
// output: recording object from db
export const getRecording = os
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input }) => {
    const row = await db
      .select()
      .from(recording)
      .where(and(eq(recording.id, input.id), notDeleted(recording)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!row) {
      return;
    }

    return await withResolvedAudioUrl(row);
  });

// create a new recording after you've recorded
// input: audio blob url, selected prompt
// output: recording object from db -> doesn't really matter
// processing: create recording object, then start transcription using whisper-1, then update recording object
// processing: analysing a recording - run through the transcript, find the linguistic errors and create records in the db
// ** hesitations come from looking at the timestamps and finding gaps greater than a threshold
// ** Claude Sonnet will:
//    -  look through the transcript and flag native-language text, convert this to the target language (as "blank" error)
//    -  look for grammatical and lexical mistakes, create corrections
export const createRecording = os
  .input(
    z.object({
      audioKey: z.string().min(1),
      prompt: z.string().min(1),
      seriesId: z.uuid().optional(),
    })
  )
  .handler(async ({ input }) => {
    logInfo("recording.create.start", {
      audioKey: input.audioKey,
      prompt: input.prompt,
      seriesId: input.seriesId,
    });
    const [createdRecording] = await db
      .insert(recording)
      .values({
        audioKey: input.audioKey,
        prompt: input.prompt,
        seriesId: input.seriesId,
      })
      .returning();
    const analysis = await getRecordingAnalysisPayload(input.audioKey);

    logInfo("recording.create.analysis-ready", {
      errorCount: analysis.errors.length,
      recordingId: createdRecording.id,
    });
    return await replaceRecordingAnalysis(createdRecording.id, analysis);
  });

export const reanalyseRecording = os
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input }) => {
    logInfo("recording.reanalyse.start", {
      recordingId: input.id,
    });
    const [existingRecording] = await db
      .select({
        audioKey: recording.audioKey,
      })
      .from(recording)
      .where(and(eq(recording.id, input.id), notDeleted(recording)))
      .limit(1);

    if (!existingRecording) {
      throw new Error("Recording not found");
    }

    const analysis = await getRecordingAnalysisPayload(
      existingRecording.audioKey
    );

    logInfo("recording.reanalyse.analysis-ready", {
      errorCount: analysis.errors.length,
      recordingId: input.id,
    });
    return await replaceRecordingAnalysis(input.id, analysis);
  });

// delete a recording by id
// input: recording id
// output: success message
export const deleteRecording = os
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input }) => {
    const deletedAt = new Date();
    const recordingErrors = await db
      .select({
        languageItemId: errorInstance.languageItemId,
      })
      .from(errorInstance)
      .innerJoin(recording, eq(errorInstance.storyId, recording.id))
      .where(
        and(
          eq(errorInstance.storyId, input.id),
          notDeleted(errorInstance),
          notDeleted(recording)
        )
      );

    const languageItemIds = recordingErrors.flatMap(({ languageItemId }) =>
      languageItemId ? [languageItemId] : []
    );

    await db.transaction(async (tx) => {
      const [deletedRecording] = await tx
        .update(recording)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(and(eq(recording.id, input.id), notDeleted(recording)))
        .returning({ id: recording.id });

      if (!deletedRecording) {
        return;
      }

      await tx
        .update(errorInstance)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(
          and(eq(errorInstance.storyId, input.id), notDeleted(errorInstance))
        );

      if (languageItemIds.length > 0) {
        const activeReferences = await tx
          .selectDistinct({ languageItemId: errorInstance.languageItemId })
          .from(errorInstance)
          .innerJoin(recording, eq(errorInstance.storyId, recording.id))
          .where(
            and(
              inArray(errorInstance.languageItemId, languageItemIds),
              notDeleted(errorInstance),
              notDeleted(recording),
              ne(errorInstance.storyId, input.id)
            )
          );

        const activeLanguageItemIds = new Set(
          activeReferences.flatMap(({ languageItemId }) =>
            languageItemId ? [languageItemId] : []
          )
        );

        const orphanedLanguageItemIds = languageItemIds.filter(
          (languageItemId) => !activeLanguageItemIds.has(languageItemId)
        );

        if (orphanedLanguageItemIds.length > 0) {
          await tx
            .update(languageItem)
            .set({ deletedAt, updatedAt: deletedAt })
            .where(
              and(
                inArray(languageItem.id, orphanedLanguageItemIds),
                notDeleted(languageItem)
              )
            );
        }
      }
    });

    return { success: true };
  });
