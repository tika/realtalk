import { os } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "#/db";
import { series } from "#/db/schema";
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
