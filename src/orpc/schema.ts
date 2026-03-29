import { z } from "zod";

const dbTimestamps = {
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
};

export const storySchema = z.object({
  ...dbTimestamps,
  id: z.number().int().min(1),
  prompt: z.string(),
  transcript: z.string().nullable(),
  timestamps: z.any().nullable(), // TODO: make less generic
});
