import { and, eq } from "drizzle-orm";
import { match } from "ts-pattern";
import * as z from "zod";

import { db } from "#/db";
import { topic, user } from "#/db/schema";
import { notDeleted } from "#/db/soft-delete";
import { generatePracticePrompts } from "#/lib/ai";
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

export const getTopic = authedProcedure
  .input(z.object({ id: z.uuid() }))
  .handler(async ({ input, context }) => {
    const userId = await resolveUserId(context.userId);
    return await db
      .select()
      .from(topic)
      .where(
        and(eq(topic.id, input.id), eq(topic.userId, userId), notDeleted(topic))
      )
      .limit(1)
      .then((rows) => rows[0]);
  });

export const getAllTopics = authedProcedure
  .input(z.object({}))
  .handler(async ({ context }) => {
    const userId = await resolveUserId(context.userId);
    return await db
      .select()
      .from(topic)
      .where(and(eq(topic.userId, userId), notDeleted(topic)));
  });

export const createTopic = authedProcedure
  .input(
    z.object({
      name: z.string().min(1),
      words: z.string().min(1).array().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const userId = await resolveUserId(context.userId);
    const [created] = await db
      .insert(topic)
      .values({
        name: input.name,
        userId,
        words: input.words,
      })
      .returning();
    return created;
  });

export const editTopic = authedProcedure
  .input(
    z.object({
      id: z.uuid(),
      name: z.string().min(1).optional(),
      words: z.string().min(1).array().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const userId = await resolveUserId(context.userId);
    const [updated] = await db
      .update(topic)
      .set({
        name: input.name,
        updatedAt: new Date(),
        words: input.words,
      })
      .where(
        and(eq(topic.id, input.id), eq(topic.userId, userId), notDeleted(topic))
      )
      .returning();
    return updated;
  });

export const getPrompts = authedProcedure
  .input(z.object({ topicId: z.uuid() }))
  .handler(async ({ input, context }) => {
    const userId = await resolveUserId(context.userId);

    const [topicRecord, userRecord] = await Promise.all([
      db
        .select()
        .from(topic)
        .where(
          and(
            eq(topic.id, input.topicId),
            eq(topic.userId, userId),
            notDeleted(topic)
          )
        )
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (!topicRecord) {
      throw new Error("Topic not found");
    }
    if (!userRecord) {
      throw new Error("User not found");
    }
    if (topicRecord.words.length === 0) {
      throw new Error("Topic has no words. Add some words first.");
    }

    const result = await generatePracticePrompts(
      topicRecord.words,
      userRecord.targetLanguage,
      userRecord.nativeLanguage
    );

    return match(result)
      .with({ success: true }, ({ data }) => data)
      .with({ success: false }, ({ error }) => {
        throw error;
      })
      .exhaustive();
  });
