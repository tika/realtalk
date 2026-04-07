import { sql } from "drizzle-orm";
import {
  check,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./columns.helper";

export const errorType = pgEnum("error_type", [
  "hesitation",
  "mistake",
  "fallback", // code-switching back to native language
]);

export const user = pgTable("user", {
  ...timestamps,
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  nativeLanguage: text("native_language").notNull(),
  targetLanguage: text("target_language").notNull(),
});
export type User = typeof user.$inferSelect;

export const topic = pgTable(
  "topic",
  {
    ...timestamps,
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    words: text("words")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
  },
  (t) => [unique("topic_name_user_unique").on(t.name, t.userId)]
);
export type Topic = typeof topic.$inferSelect;

export const recording = pgTable("recording", {
  ...timestamps,
  id: uuid("id").defaultRandom().primaryKey(),
  audioKey: text("audio_key").notNull(), // R2 object key
  prompt: text("prompt").notNull(),
  targetWords: text("target_words")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topic.id),
  timestamps: json("timestamps"), // from transcription api
  transcript: text("transcript"),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  missedTargetWords: text("missed_target_words")
    .array()
    .default(sql`'{}'::text[]`),
  summary: text("summary"), // "teacher"-generated summary
});
export type Recording = typeof recording.$inferSelect;

export const errorInstance = pgTable(
  "error_instance",
  {
    ...timestamps,
    id: uuid("id").defaultRandom().primaryKey(),
    errorType: errorType("error_type").notNull(),
    originalText: text("original_text").notNull(),
    correctedText: text("corrected_text").notNull(),
    context: text("context").notNull(), // context around the error
    severity: integer("severity").notNull().default(5),
    startTimeMs: integer("start_time_ms").notNull(),
    endTimeMs: integer("end_time_ms").notNull(),

    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recording.id),
  },
  (t) => [
    check("severity_in_range", sql`${t.severity} >= 1 AND ${t.severity} <= 10`),
  ]
);
export type ErrorInstance = typeof errorInstance.$inferSelect;
