import { and, eq, inArray } from "drizzle-orm";
import { match } from "ts-pattern";
import * as z from "zod";

import { db } from "#/db";
import { errorInstance, recording, topic, user } from "#/db/schema";
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
import { authedProcedure } from "#/orpc/procedures";

interface ResolvedTranscriptAnalysisError extends TranscriptAnalysisError {
  endTimeMs: number;
  startTimeMs: number;
}

interface RecordingAnalysisPayload {
  errors: ResolvedTranscriptAnalysisError[];
  missedTargetWords: string[];
  summary: string;
  timestamps: z.infer<typeof transcriptWordSchema>[];
  transcript: string;
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

interface AnalysisContext {
  nativeLanguage: string;
  targetLanguage: string;
  targetWords?: string[];
}

const getRecordingAnalysisPayload = async (
  audioKey: string,
  analysisContext: AnalysisContext
): Promise<RecordingAnalysisPayload> => {
  logInfo("recording-analysis.start", {
    audioKey,
  });
  const audioUrl = await resolveAudioUrl(audioKey);
  const transcriptionResult = await transcribeAudioFromUrl(
    audioUrl,
    analysisContext.targetLanguage
  );
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
    prompts.findErrors(
      numberedTranscript,
      analysisContext.targetLanguage,
      analysisContext.nativeLanguage,
      analysisContext.targetWords
    )
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
    missedTargetWords: transcriptAnalysis.missed_target_words,
    summary: transcriptAnalysis.summary,
    timestamps,
    transcript,
  };
};

const replaceRecordingAnalysis = async (
  recordingId: string,
  analysis: RecordingAnalysisPayload
) => {
  const existingRecordingErrors = await db
    .select({ id: errorInstance.id })
    .from(errorInstance)
    .where(
      and(eq(errorInstance.recordingId, recordingId), notDeleted(errorInstance))
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

    const [updatedRecording] = await tx
      .update(recording)
      .set({
        missedTargetWords: analysis.missedTargetWords,
        summary: analysis.summary,
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
      await tx.insert(errorInstance).values({
        context: analysisError.context,
        correctedText: analysisError.corrected_text,
        endTimeMs: analysisError.endTimeMs,
        errorType: analysisError.type,
        originalText: analysisError.original_text,
        recordingId,
        severity: analysisError.severity,
        startTimeMs: analysisError.startTimeMs,
      });
    }

    return updatedRecording;
  });
};

const withResolvedAudioUrl = async <T extends { audioKey: string }>(
  record: T
): Promise<T & { audioUrl: string }> => {
  const audioUrl = await resolveAudioUrl(record.audioKey);
  return { ...record, audioUrl };
};

export const getAllRecordings = authedProcedure
  .input(z.object({}))
  .handler(async ({ context }) => {
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.clerkId, context.userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!userRecord) {
      throw new Error("User not found");
    }

    const rows = await db
      .select()
      .from(recording)
      .where(and(eq(recording.userId, userRecord.id), notDeleted(recording)));
    return await Promise.all(rows.map(withResolvedAudioUrl));
  });

export const getRecording = authedProcedure
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input, context }) => {
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.clerkId, context.userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!userRecord) {
      throw new Error("User not found");
    }

    const row = await db
      .select()
      .from(recording)
      .where(
        and(
          eq(recording.id, input.id),
          eq(recording.userId, userRecord.id),
          notDeleted(recording)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!row) {
      return;
    }

    return await withResolvedAudioUrl(row);
  });

export const createRecording = authedProcedure
  .input(
    z.object({
      audioKey: z.string().min(1),
      prompt: z.string().min(1),
      targetWords: z.string().array().optional(),
      topicId: z.uuid(),
    })
  )
  .handler(async ({ input, context }) => {
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.clerkId, context.userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!userRecord) {
      throw new Error("User not found");
    }

    const topicRecord = await db
      .select()
      .from(topic)
      .where(
        and(
          eq(topic.id, input.topicId),
          eq(topic.userId, userRecord.id),
          notDeleted(topic)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!topicRecord) {
      throw new Error("Topic not found");
    }

    const targetWords = input.targetWords ?? topicRecord.words;

    logInfo("recording.create.start", {
      audioKey: input.audioKey,
      prompt: input.prompt,
      topicId: input.topicId,
    });

    const [createdRecording] = await db
      .insert(recording)
      .values({
        audioKey: input.audioKey,
        prompt: input.prompt,
        targetWords,
        topicId: input.topicId,
        userId: userRecord.id,
      })
      .returning();

    const analysis = await getRecordingAnalysisPayload(input.audioKey, {
      nativeLanguage: userRecord.nativeLanguage,
      targetLanguage: userRecord.targetLanguage,
      targetWords,
    });

    logInfo("recording.create.analysis-ready", {
      errorCount: analysis.errors.length,
      recordingId: createdRecording.id,
    });

    return await replaceRecordingAnalysis(createdRecording.id, analysis);
  });

export const reanalyseRecording = authedProcedure
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input, context }) => {
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.clerkId, context.userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!userRecord) {
      throw new Error("User not found");
    }

    logInfo("recording.reanalyse.start", {
      recordingId: input.id,
    });

    const [existingRecording] = await db
      .select({
        audioKey: recording.audioKey,
        targetWords: recording.targetWords,
      })
      .from(recording)
      .where(
        and(
          eq(recording.id, input.id),
          eq(recording.userId, userRecord.id),
          notDeleted(recording)
        )
      )
      .limit(1);

    if (!existingRecording) {
      throw new Error("Recording not found");
    }

    const analysis = await getRecordingAnalysisPayload(
      existingRecording.audioKey,
      {
        nativeLanguage: userRecord.nativeLanguage,
        targetLanguage: userRecord.targetLanguage,
        targetWords: existingRecording.targetWords,
      }
    );

    logInfo("recording.reanalyse.analysis-ready", {
      errorCount: analysis.errors.length,
      recordingId: input.id,
    });

    return await replaceRecordingAnalysis(input.id, analysis);
  });

export const deleteRecording = authedProcedure
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input, context }) => {
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.clerkId, context.userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!userRecord) {
      throw new Error("User not found");
    }

    const deletedAt = new Date();

    await db.transaction(async (tx) => {
      const [deletedRecording] = await tx
        .update(recording)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(
          and(
            eq(recording.id, input.id),
            eq(recording.userId, userRecord.id),
            notDeleted(recording)
          )
        )
        .returning({ id: recording.id });

      if (!deletedRecording) {
        return;
      }

      await tx
        .update(errorInstance)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(
          and(
            eq(errorInstance.recordingId, input.id),
            notDeleted(errorInstance)
          )
        );
    });

    return { success: true };
  });
