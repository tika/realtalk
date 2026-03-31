import { os } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { errorInstance, recording } from "#/db/schema";
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
        .innerJoin(recording, eq(errorInstance.storyId, recording.id))
        .where(
          and(
            eq(errorInstance.id, input.id),
            notDeleted(errorInstance),
            notDeleted(recording)
          )
        )
        .then((rows) => rows.map(({ item }) => item))
  );

// get all error instances for a given recording id
export const getErrorInstancesForRecording = os
  .input(
    z.object({
      recordingId: z.uuid(),
    })
  )
  .handler(
    async ({ input }) =>
      await db
        .select({ item: errorInstance })
        .from(errorInstance)
        .innerJoin(recording, eq(errorInstance.storyId, recording.id))
        .where(
          and(
            eq(errorInstance.storyId, input.recordingId),
            notDeleted(errorInstance),
            notDeleted(recording)
          )
        )
        .then((rows) => rows.map(({ item }) => item))
  );
