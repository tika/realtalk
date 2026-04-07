import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { errorInstance, recording, user } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";
import { authedProcedure } from "#/orpc/procedures";

const resolveUserId = async (clerkId: string) => {
  const record = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.clerkId, clerkId))
    .limit(1)
    .then((rows) => rows[0]);
  if (!record) {
    throw new Error("User not found");
  }
  return record.id;
};

// given an error id, return the error instance
export const getErrorInstance = authedProcedure
  .input(
    z.object({
      id: z.uuid(),
    })
  )
  .handler(async ({ input, context }) => {
    const userId = await resolveUserId(context.userId);
    return await db
      .select({ item: errorInstance })
      .from(errorInstance)
      .innerJoin(recording, eq(errorInstance.recordingId, recording.id))
      .where(
        and(
          eq(errorInstance.id, input.id),
          eq(recording.userId, userId),
          notDeleted(errorInstance),
          notDeleted(recording)
        )
      )
      .then((rows) => rows.map(({ item }) => item));
  });

// get all error instances for a given recording id
export const getErrorInstancesForRecording = authedProcedure
  .input(
    z.object({
      recordingId: z.uuid(),
    })
  )
  .handler(async ({ input, context }) => {
    const userId = await resolveUserId(context.userId);
    return await db
      .select({ item: errorInstance })
      .from(errorInstance)
      .innerJoin(recording, eq(errorInstance.recordingId, recording.id))
      .where(
        and(
          eq(errorInstance.recordingId, input.recordingId),
          eq(recording.userId, userId),
          notDeleted(errorInstance),
          notDeleted(recording)
        )
      )
      .then((rows) => rows.map(({ item }) => item));
  });
