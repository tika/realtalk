import {
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./columns.helper";

export const errorType = pgEnum("error_type", [
  "hesitation",
  "blank",
  "mistake",
]);

export const languageItemType = pgEnum("language_item_type", [
  "vocab",
  "phrase",
  "grammar_rule",
]);

export const recording = pgTable("recording", {
  ...timestamps,
  id: uuid("id").defaultRandom().primaryKey(),
  audioKey: text("audio_key").notNull(), // S3 object key
  prompt: text("prompt").notNull(),
  transcript: text("transcript"),
  timestamps: json("timestamps"), // from transcription api
  seriesId: uuid("series_id").references(() => series.id), // optional grouping
});
export type Recording = typeof recording.$inferSelect;

export const series = pgTable("series", {
  ...timestamps,
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
});
export type Series = typeof series.$inferSelect;

export const languageItem = pgTable("language_item", {
  ...timestamps,
  id: uuid("id").defaultRandom().primaryKey(),
  nativeText: text("native_text").notNull(),
  purpose: text("purpose").notNull(),
  targetText: text("target_text").notNull(),
  type: languageItemType("type").notNull(),
});
export type LanguageItem = typeof languageItem.$inferSelect;

export const errorInstance = pgTable("error_instance", {
  ...timestamps,
  corrected_text: text("corrected_text").notNull(),
  errorType: errorType("error_type").notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  languageItemId: uuid("language_item_id").references(() => languageItem.id),
  original_text: text("original_text").notNull(),
  context: text("context").notNull(), // context around the error
  rating: integer("rating").notNull().default(5),
  startTimeMs: integer("start_time_ms").notNull(),
  endTimeMs: integer("end_time_ms").notNull(),

  storyId: uuid("story_id")
    .notNull()
    .references(() => recording.id),
});
export type ErrorInstance = typeof errorInstance.$inferSelect;
