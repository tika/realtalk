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

const secondsToMilliseconds = (valueInSeconds: number) =>
  Math.round(valueInSeconds * 1000);

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
    end: secondsToMilliseconds(endWord.end),
    start: secondsToMilliseconds(startWord.start),
  };
};
