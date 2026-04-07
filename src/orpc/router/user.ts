import { eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "#/db";
import { user } from "#/db/schema";
import { authedProcedure } from "#/orpc/procedures";

export const getUser = authedProcedure.input(z.object({})).handler(
  async ({ context }) =>
    await db
      .select()
      .from(user)
      .where(eq(user.clerkId, context.userId))
      .limit(1)
      .then((rows) => rows[0] ?? null)
);

export const createUser = authedProcedure
  .input(
    z.object({
      nativeLanguage: z.string().min(1),
      targetLanguage: z.string().min(1),
    })
  )
  .handler(async ({ input, context }) => {
    const [created] = await db
      .insert(user)
      .values({
        clerkId: context.userId,
        nativeLanguage: input.nativeLanguage,
        targetLanguage: input.targetLanguage,
      })
      .returning();
    return created;
  });

export const updateUser = authedProcedure
  .input(
    z.object({
      nativeLanguage: z.string().min(1).optional(),
      targetLanguage: z.string().min(1).optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const [updated] = await db
      .update(user)
      .set({
        nativeLanguage: input.nativeLanguage,
        targetLanguage: input.targetLanguage,
        updatedAt: new Date(),
      })
      .where(eq(user.clerkId, context.userId))
      .returning();
    return updated;
  });
