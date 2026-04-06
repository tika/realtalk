import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "#/db";
import { recording, series } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";
import { authedProcedure } from "#/orpc/procedures";

export const getSeries = authedProcedure
  .input(z.object({ id: z.uuid() }))
  .handler(
    async ({ input, context }) =>
      await db
        .select()
        .from(series)
        .where(
          and(
            eq(series.id, input.id),
            eq(series.userId, context.userId),
            notDeleted(series)
          )
        )
        .limit(1)
        .then((rows) => rows[0])
  );

export const getAllSeries = authedProcedure.input(z.object({})).handler(
  async ({ context }) =>
    await db
      .select()
      .from(series)
      .where(and(eq(series.userId, context.userId), notDeleted(series)))
);

export const createSeries = authedProcedure
  .input(z.object({ title: z.string().min(1) }))
  .handler(async ({ input, context }) => {
    const [created] = await db
      .insert(series)
      .values({ title: input.title, userId: context.userId })
      .returning();
    return created;
  });

export const convertToSeries = authedProcedure
  .input(z.object({ recordingId: z.uuid() }))
  .handler(async ({ input, context }) => {
    const [existingRecording] = await db
      .select({ prompt: recording.prompt, seriesId: recording.seriesId })
      .from(recording)
      .where(
        and(
          eq(recording.id, input.recordingId),
          eq(recording.userId, context.userId),
          notDeleted(recording)
        )
      )
      .limit(1);

    if (!existingRecording) {
      throw new Error("Recording not found");
    }

    if (existingRecording.seriesId) {
      const [existingSeries] = await db
        .select()
        .from(series)
        .where(
          and(
            eq(series.id, existingRecording.seriesId),
            eq(series.userId, context.userId),
            notDeleted(series)
          )
        )
        .limit(1);
      return existingSeries;
    }

    const [created] = await db
      .insert(series)
      .values({ title: existingRecording.prompt, userId: context.userId })
      .returning();

    await db
      .update(recording)
      .set({ seriesId: created.id, updatedAt: new Date() })
      .where(eq(recording.id, input.recordingId));

    return created;
  });
