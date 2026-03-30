import { os } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { errorInstance, story } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";

// given an error id, return the error instance
export const getErrorInstance = os
  .input(
    z.object({
      id: z.uuid(),
    })
  )
  .handler(
    async ({ input }) =>
      await db
        .select({ item: errorInstance })
        .from(errorInstance)
        .innerJoin(story, eq(errorInstance.storyId, story.id))
        .where(
          and(
            eq(errorInstance.id, input.id),
            notDeleted(errorInstance),
            notDeleted(story)
          )
        )
        .then((rows) => rows.map(({ item }) => item))
  );

// get all error instances for a given story id
export const getErrorInstancesForStory = os
  .input(
    z.object({
      storyId: z.uuid(),
    })
  )
  .handler(
    async ({ input }) =>
      await db
        .select({ item: errorInstance })
        .from(errorInstance)
        .innerJoin(story, eq(errorInstance.storyId, story.id))
        .where(
          and(
            eq(errorInstance.storyId, input.storyId),
            notDeleted(errorInstance),
            notDeleted(story)
          )
        )
        .then((rows) => rows.map(({ item }) => item))
  );
