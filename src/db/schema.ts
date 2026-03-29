import {
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./columns.helper";

export const errorType = pgEnum("error_type", [
  "hesitation",
  "blank",
  "mistake",
]);

export const languageItemType = pgEnum("language_item_type", [
  "word",
  "sentence",
  "paragraph",
]);

export const story = pgTable("story", {
  ...timestamps,
  id: uuid("id").defaultRandom().primaryKey(),
  audioUrl: text("audio_url").notNull(), // link to blob
  prompt: text("prompt").notNull(),
  transcript: text("transcript"),
  timestamps: json("timestamps"), // from transcription api
});
export type Story = typeof story.$inferSelect;

export const languageItem = pgTable("language_item", {
  ...timestamps,
  id: uuid("id").defaultRandom().primaryKey(),
  nativeText: text("native_text").notNull(),
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

  storyId: uuid("story_id")
    .notNull()
    .references(() => story.id),

  // when did the error happen in the transcript?
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
});
export type ErrorInstance = typeof errorInstance.$inferSelect;
