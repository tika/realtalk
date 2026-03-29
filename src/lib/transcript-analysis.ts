import { z } from "zod";

/**
 * Structured contract for the Claude transcript-analysis response.
 *
 * Keeping this next to the transcript-analysis domain logic makes the route and
 * OpenRouter client easier to scan, and gives us one place to evolve the
 * response shape when the prompt changes.
 */
export const transcriptAnalysisSchema = z.object({
  errors: z.array(
    z.object({
      context: z.string(),
      corrected: z.string(),
      rating: z.number(),
      language_item: z.object({
        native_text: z.string(),
        target_text: z.string(),
        type: z.enum(["vocab", "grammar_rule", "phrase"]),
      }),
      said: z.string(),
      type: z.enum(["blank", "mistake"]),
    })
  ),
});

export type TranscriptAnalysis = z.infer<typeof transcriptAnalysisSchema>;

export type TranscriptAnalysisError = TranscriptAnalysis["errors"][number];
