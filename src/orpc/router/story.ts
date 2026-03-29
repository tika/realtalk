import { os } from "@orpc/server";
import { eq, inArray } from "drizzle-orm";
import { match } from "ts-pattern";
import * as z from "zod";

import { db } from "#/db";
import { errorInstance, languageItem, story } from "#/db/schema";
import { analyzeTranscript, transcribeAudioFromUrl } from "#/lib/ai";
import { prompts } from "#/lib/prompts";
import { transcriptWordSchema } from "#/lib/transcript";

// return a list of all stories
// input: nothing
// output: array of story objects straight from db
export const getAllStories = os
  .input(z.object({}))
  .handler(async () => await db.select().from(story));

// return a single story by id
// input: story id
// output: story object from db
export const getStory = os
  .input(z.object({ id: z.uuid() }))
  .handler(
    async ({ input }) =>
      await db.select().from(story).where(eq(story.id, input.id)).limit(1)
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
    const [createdStory] = await db
      .insert(story)
      .values({
        audioUrl: input.audioUrl,
        prompt: input.prompt,
      })
      .returning();

    const transcriptionResult = await transcribeAudioFromUrl(input.audioUrl);
    const transcription = match(transcriptionResult)
      .with({ success: true }, ({ data }) => data)
      .with({ success: false }, ({ error }) => {
        throw new Error(`Story transcription failed: ${error.message}`);
      })
      .exhaustive();
    const parsedWords = z
      .array(transcriptWordSchema)
      .parse(transcription.words);

    const [updatedStory] = await db
      .update(story)
      .set({
        timestamps: parsedWords,
        transcript: transcription.text,
        updatedAt: new Date(),
      })
      .where(eq(story.id, createdStory.id))
      .returning();

    const transcriptAnalysisResult = await analyzeTranscript(
      prompts.findErrors(transcription.text)
    );
    const transcriptAnalysis = match(transcriptAnalysisResult)
      .with({ success: true }, ({ data }) => data)
      .with({ success: false }, ({ error }) => {
        throw new Error(`Story analysis failed: ${error.message}`);
      })
      .exhaustive();

    await db.transaction(async (tx) => {
      for (const analysisError of transcriptAnalysis.errors) {
        const [createdLanguageItem] = await tx
          .insert(languageItem)
          .values({
            nativeText: analysisError.language_item.native_text,
            targetText: analysisError.language_item.target_text,
            type: analysisError.language_item.type,
          })
          .returning();

        await tx.insert(errorInstance).values({
          context: analysisError.context,
          corrected_text: analysisError.corrected,
          errorType: analysisError.type,
          languageItemId: createdLanguageItem.id,
          original_text: analysisError.said,
          storyId: createdStory.id,
        });
      }
    });

    return updatedStory;
  });

// delete a story by id
// input: story id
// output: success message
export const deleteStory = os
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input }) => {
    const storyErrors = await db
      .select({
        errorId: errorInstance.id,
        languageItemId: errorInstance.languageItemId,
      })
      .from(errorInstance)
      .where(eq(errorInstance.storyId, input.id));

    const languageItemIds = storyErrors.flatMap(({ languageItemId }) =>
      languageItemId ? [languageItemId] : []
    );

    await db.transaction(async (tx) => {
      await tx.delete(errorInstance).where(eq(errorInstance.storyId, input.id));

      if (languageItemIds.length > 0) {
        await tx
          .delete(languageItem)
          .where(inArray(languageItem.id, languageItemIds));
      }

      await tx.delete(story).where(eq(story.id, input.id));
    });

    return { success: true };
  });
