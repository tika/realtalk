import { os } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "#/db";
import { recording, series } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";

export const getSeries = os.input(z.object({ id: z.uuid() })).handler(
  async ({ input }) =>
    await db
      .select()
      .from(series)
      .where(and(eq(series.id, input.id), notDeleted(series)))
      .limit(1)
      .then((rows) => rows[0])
);

export const getAllSeries = os
  .input(z.object({}))
  .handler(
    async () => await db.select().from(series).where(notDeleted(series))
  );

export const createSeries = os
  .input(z.object({ title: z.string().min(1) }))
  .handler(async ({ input }) => {
    const [created] = await db
      .insert(series)
      .values({ title: input.title })
      .returning();
    return created;
  });

export const convertToSeries = os
  .input(z.object({ recordingId: z.uuid() }))
  .handler(async ({ input }) => {
    const [existingRecording] = await db
      .select({ prompt: recording.prompt, seriesId: recording.seriesId })
      .from(recording)
      .where(and(eq(recording.id, input.recordingId), notDeleted(recording)))
      .limit(1);

    if (!existingRecording) {
      throw new Error("Recording not found");
    }

    if (existingRecording.seriesId) {
      const [existingSeries] = await db
        .select()
        .from(series)
        .where(
          and(eq(series.id, existingRecording.seriesId), notDeleted(series))
        )
        .limit(1);
      return existingSeries;
    }

    const [created] = await db
      .insert(series)
      .values({ title: existingRecording.prompt })
      .returning();

    await db
      .update(recording)
      .set({ seriesId: created.id, updatedAt: new Date() })
      .where(eq(recording.id, input.recordingId));

    return created;
  });
