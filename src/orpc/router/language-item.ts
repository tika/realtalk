import { os } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "#/db";
import { errorInstance, languageItem, story } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";

// get all language items for an error instance
// input: error instance id
// output: array of language items for that error instance
export const getLanguageItemsForErrorInstance = os
  .input(z.object({ errorInstanceId: z.uuid() }))
  .handler(async ({ input }) => {
    const rows = await db
      .select({ item: languageItem })
      .from(errorInstance)
      .innerJoin(
        languageItem,
        eq(errorInstance.languageItemId, languageItem.id)
      )
      .innerJoin(story, eq(errorInstance.storyId, story.id))
      .where(
        and(
          eq(errorInstance.id, input.errorInstanceId),
          notDeleted(errorInstance),
          notDeleted(languageItem),
          notDeleted(story)
        )
      );

    return rows.map(({ item }) => item);
  });

// get all language items for a story id
// input: story id
// output: array of language items for that story
export const getLanguageItemsForStory = os
  .input(z.object({ storyId: z.uuid() }))
  .handler(async ({ input }) => {
    const rows = await db
      .selectDistinct({ item: languageItem })
      .from(errorInstance)
      .innerJoin(
        languageItem,
        eq(errorInstance.languageItemId, languageItem.id)
      )
      .innerJoin(story, eq(errorInstance.storyId, story.id))
      .where(
        and(
          eq(errorInstance.storyId, input.storyId),
          notDeleted(errorInstance),
          notDeleted(languageItem),
          notDeleted(story)
        )
      );

    return rows.map(({ item }) => item);
  });

// return all language items
// input: nothing
// output: array of language items
export const getAllLanguageItems = os
  .input(z.object({}))
  .handler(
    async () =>
      await db.select().from(languageItem).where(notDeleted(languageItem))
  );
