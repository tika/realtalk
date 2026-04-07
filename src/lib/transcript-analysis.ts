import { z } from "zod";

/**
 * Structured contract for the transcript-analysis response.
 *
 * Keeping this next to the transcript-analysis domain logic makes the route and
 * OpenRouter client easier to scan, and gives us one place to evolve the
 * response shape when the prompt changes.
 */
export const transcriptAnalysisSchema = z.object({
  errors: z.array(
    z.object({
      context: z.string(),
      corrected_text: z.string(),
      original_text: z.string(),
      severity: z.number().int().min(1).max(10),
      type: z.enum(["fallback", "mistake", "hesitation"]),
      word_end: z.number().int().nonnegative(),
      word_start: z.number().int().nonnegative(),
    })
  ),
  missed_target_words: z.array(z.string()),
  summary: z.string(),
});

export type TranscriptAnalysis = z.infer<typeof transcriptAnalysisSchema>;

export type TranscriptAnalysisError = TranscriptAnalysis["errors"][number];
