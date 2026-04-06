import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { errorInstance, recording } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";
import { authedProcedure } from "#/orpc/procedures";

// given an error id, return the error instance
export const getErrorInstance = authedProcedure
  .input(
    z.object({
      id: z.uuid(),
    })
  )
  .handler(
    async ({ input, context }) =>
      await db
        .select({ item: errorInstance })
        .from(errorInstance)
        .innerJoin(recording, eq(errorInstance.storyId, recording.id))
        .where(
          and(
            eq(errorInstance.id, input.id),
            eq(recording.userId, context.userId),
            notDeleted(errorInstance),
            notDeleted(recording)
          )
        )
        .then((rows) => rows.map(({ item }) => item))
  );

// get all error instances for a given recording id
export const getErrorInstancesForRecording = authedProcedure
  .input(
    z.object({
      recordingId: z.uuid(),
    })
  )
  .handler(
    async ({ input, context }) =>
      await db
        .select({ item: errorInstance })
        .from(errorInstance)
        .innerJoin(recording, eq(errorInstance.storyId, recording.id))
        .where(
          and(
            eq(errorInstance.storyId, input.recordingId),
            eq(recording.userId, context.userId),
            notDeleted(errorInstance),
            notDeleted(recording)
          )
        )
        .then((rows) => rows.map(({ item }) => item))
  );
