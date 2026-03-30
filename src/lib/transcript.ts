import { z } from "zod";

/**
 * Word-level timestamp payload returned by Whisper verbose JSON responses.
 * This schema is shared by the OpenRouter client and the story router so the
 * transcript shape stays defined in one place.
 */
export const transcriptWordSchema = z.object({
  end: z.number(),
  start: z.number(),
  word: z.string(),
});

export type TranscriptWord = z.infer<typeof transcriptWordSchema>;

export const buildNumberedTranscript = (words: TranscriptWord[]) =>
  words.map((word, index) => `[${index}] ${word.word.trim()}`).join(" ");

/**
 * Normalizes transcript text for fuzzy alignment between model-produced error
 * snippets and the word-by-word transcription output.
 */
export const normalizeTranscriptText = (value: string) =>
  value
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s]/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

export const tokenizeTranscriptText = (value: string) =>
  normalizeTranscriptText(value).split(" ").filter(Boolean);

/**
 * Converts a transcript offset in seconds into a stable Date object anchored
 * to the Unix epoch. This is useful when a consumer requires a Date-like shape
 * for relative media timing rather than wall-clock time.
 */
export const secondsToTimestamp = (seconds: number) =>
  new Date(Math.max(0, seconds) * 1000);

export const getTranscriptWordRange = (
  words: TranscriptWord[],
  startIndex: number,
  endIndex: number
) => {
  const startWord = words[startIndex];
  const endWord = words[endIndex];

  if (!startWord || !endWord) {
    throw new Error(
      `Transcript analysis returned an out-of-bounds word range: ${startIndex}-${endIndex}`
    );
  }

  if (startIndex > endIndex) {
    throw new Error(
      `Transcript analysis returned an invalid word range: ${startIndex}-${endIndex}`
    );
  }

  return {
    end: endWord.end,
    start: startWord.start,
  };
};
