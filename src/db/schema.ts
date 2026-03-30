import {
  integer,
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
  "vocab",
  "phrase",
  "grammar_rule",
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
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),

  storyId: uuid("story_id")
    .notNull()
    .references(() => story.id),
});
export type ErrorInstance = typeof errorInstance.$inferSelect;
