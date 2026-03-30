import { os } from "@orpc/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { match } from "ts-pattern";
import * as z from "zod";

import { db } from "#/db";
import { errorInstance, languageItem, story } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";
import { analyzeTranscript, transcribeAudioFromUrl } from "#/lib/ai";
import { logError, logInfo } from "#/lib/observability";
import { prompts } from "#/lib/prompts";
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

interface StoryAnalysisPayload {
  errors: ResolvedTranscriptAnalysisError[];
  transcript: string;
  timestamps: z.infer<typeof transcriptWordSchema>[];
}

const getStoryAnalysisPayload = async (
  audioUrl: string
): Promise<StoryAnalysisPayload> => {
  logInfo("story-analysis.start", {
    audioUrl,
  });
  const transcriptionResult = await transcribeAudioFromUrl(audioUrl);
  const transcription = match(transcriptionResult)
    .with({ success: true }, ({ data }) => data)
    .with({ success: false }, ({ error }) => {
      logError("story-analysis.transcription-failed", {
        audioUrl,
        error,
      });
      throw new Error(`Story transcription failed: ${error.message}`);
    })
    .exhaustive();

  const transcript = transcription.text;
  const timestamps = z.array(transcriptWordSchema).parse(transcription.words);
  const numberedTranscript = buildNumberedTranscript(timestamps);
  logInfo("story-analysis.transcription-ready", {
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
      logError("story-analysis.model-failed", {
        audioUrl,
        error,
      });
      throw new Error(`Story analysis failed: ${error.message}`);
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

  logInfo("story-analysis.success", {
    audioUrl,
    errorCount: resolvedErrors.length,
  });

  return {
    errors: resolvedErrors,
    transcript,
    timestamps,
  };
};

const replaceStoryAnalysis = async (
  storyId: string,
  analysis: StoryAnalysisPayload
) => {
  const existingStoryErrors = await db
    .select({
      id: errorInstance.id,
      languageItemId: errorInstance.languageItemId,
    })
    .from(errorInstance)
    .where(and(eq(errorInstance.storyId, storyId), notDeleted(errorInstance)));

  const languageItemIds = existingStoryErrors.flatMap(({ languageItemId }) =>
    languageItemId ? [languageItemId] : []
  );

  return await db.transaction(async (tx) => {
    if (existingStoryErrors.length > 0) {
      await tx.delete(errorInstance).where(
        inArray(
          errorInstance.id,
          existingStoryErrors.map(({ id }) => id)
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

    const [updatedStory] = await tx
      .update(story)
      .set({
        timestamps: analysis.timestamps,
        transcript: analysis.transcript,
        updatedAt: new Date(),
      })
      .where(eq(story.id, storyId))
      .returning();

    if (!updatedStory) {
      throw new Error("Story not found");
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
        storyId,
      });
    }

    return updatedStory;
  });
};

// return a list of all stories
// input: nothing
// output: array of story objects straight from db
export const getAllStories = os
  .input(z.object({}))
  .handler(async () => await db.select().from(story).where(notDeleted(story)));

// return a single story by id
// input: story id
// output: story object from db
export const getStory = os.input(z.object({ id: z.uuid() })).handler(
  async ({ input }) =>
    await db
      .select()
      .from(story)
      .where(and(eq(story.id, input.id), notDeleted(story)))
      .limit(1)
      .then((rows) => rows[0])
);

// create a new story after you've recorded
// input: audio blob url, selected prompt
// output: story object from db -> doesn't really matter
// processing: create story object, then start transcription using whisper-1, then update story object
// processing: analysing a story - run through the transcript, find the linguistic errors and create records in the db
// ** hesitations come from looking at the timestamps and finding gaps greater than a threshold
// ** Claude Sonnet will:
//    -  look through the transcript and flag native-language text, convert this to the target language (as "blank" error)
//    -  look for grammatical and lexical mistakes, create corrections
export const createStory = os
  .input(
    z.object({
      audioUrl: z.url(),
      prompt: z.string().min(1),
    })
  )
  .handler(async ({ input }) => {
    logInfo("story.create.start", {
      audioUrl: input.audioUrl,
      prompt: input.prompt,
    });
    const [createdStory] = await db
      .insert(story)
      .values({
        audioUrl: input.audioUrl,
        prompt: input.prompt,
      })
      .returning();
    const analysis = await getStoryAnalysisPayload(input.audioUrl);

    logInfo("story.create.analysis-ready", {
      errorCount: analysis.errors.length,
      storyId: createdStory.id,
    });
    return await replaceStoryAnalysis(createdStory.id, analysis);
  });

export const reanalyseStory = os
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input }) => {
    logInfo("story.reanalyse.start", {
      storyId: input.id,
    });
    const [existingStory] = await db
      .select({
        audioUrl: story.audioUrl,
      })
      .from(story)
      .where(and(eq(story.id, input.id), notDeleted(story)))
      .limit(1);

    if (!existingStory) {
      throw new Error("Story not found");
    }

    const analysis = await getStoryAnalysisPayload(existingStory.audioUrl);

    logInfo("story.reanalyse.analysis-ready", {
      errorCount: analysis.errors.length,
      storyId: input.id,
    });
    return await replaceStoryAnalysis(input.id, analysis);
  });

// delete a story by id
// input: story id
// output: success message
export const deleteStory = os
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input }) => {
    const deletedAt = new Date();
    const storyErrors = await db
      .select({
        languageItemId: errorInstance.languageItemId,
      })
      .from(errorInstance)
      .innerJoin(story, eq(errorInstance.storyId, story.id))
      .where(
        and(
          eq(errorInstance.storyId, input.id),
          notDeleted(errorInstance),
          notDeleted(story)
        )
      );

    const languageItemIds = storyErrors.flatMap(({ languageItemId }) =>
      languageItemId ? [languageItemId] : []
    );

    await db.transaction(async (tx) => {
      const [deletedStory] = await tx
        .update(story)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(and(eq(story.id, input.id), notDeleted(story)))
        .returning({ id: story.id });

      if (!deletedStory) {
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
          .innerJoin(story, eq(errorInstance.storyId, story.id))
          .where(
            and(
              inArray(errorInstance.languageItemId, languageItemIds),
              notDeleted(errorInstance),
              notDeleted(story),
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
