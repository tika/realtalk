import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "#/db";
import { errorInstance, languageItem } from "#/db/schema";

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
      .where(eq(errorInstance.id, input.errorInstanceId));

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
      .where(eq(errorInstance.storyId, input.storyId));

    return rows.map(({ item }) => item);
  });

// return all language items
// input: nothing
// output: array of language items
export const getAllLanguageItems = os
  .input(z.object({}))
  .handler(async () => await db.select().from(languageItem));
