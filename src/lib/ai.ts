import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { match } from "ts-pattern";
import { z } from "zod";

import { fetchAudioFileFromUrl } from "#/lib/audio";
import { err, ok } from "#/lib/result";
import type { Result } from "#/lib/result";
import { transcriptWordSchema } from "#/lib/transcript";
import type { TranscriptWord } from "#/lib/transcript";
import { transcriptAnalysisSchema } from "#/lib/transcript-analysis";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const TRANSCRIPTION_MODEL = "whisper-1";
const ANALYSIS_MODEL = "anthropic/claude-sonnet-4.6";

const getOpenRouterClient = () => {
  if (!process.env.OPENROUTER_KEY) {
    return err(new Error("OPENROUTER_KEY environment variable is not set"));
  }

  return ok(
    new OpenAI({
      apiKey: process.env.OPENROUTER_KEY,
      baseURL: OPENROUTER_BASE_URL,
    })
  );
};

export const transcribeAudioFromUrl = async (
  audioUrl: string
): Promise<Result<{ text: string; words: TranscriptWord[] }>> => {
  const clientResult = getOpenRouterClient();

  return await match(clientResult)
    .with({ success: false }, ({ error }) => err(error))
    .with({ success: true }, async ({ data: client }) => {
      const fileResult = await fetchAudioFileFromUrl(audioUrl);

      return await match(fileResult)
        .with({ success: false }, ({ error }) => err(error))
        .with({ success: true }, async ({ data: file }) => {
          try {
            const transcription = await client.audio.transcriptions.create({
              file,
              model: TRANSCRIPTION_MODEL,
              response_format: "verbose_json",
              timestamp_granularities: ["word"],
            });

            return ok({
              text: transcription.text,
              words: z
                .array(transcriptWordSchema)
                .parse(transcription.words ?? []),
            });
          } catch (error: unknown) {
            return err(
              error instanceof Error
                ? error
                : new Error("Audio transcription failed")
            );
          }
        })
        .exhaustive();
    })
    .exhaustive();
};

export const analyzeTranscript = async (
  prompt: string
): Promise<Result<z.infer<typeof transcriptAnalysisSchema>>> => {
  const clientResult = getOpenRouterClient();

  return await match(clientResult)
    .with({ success: false }, ({ error }) => err(error))
    .with({ success: true }, async ({ data: client }) => {
      try {
        const completion = await client.chat.completions.parse({
          model: ANALYSIS_MODEL,
          messages: [{ role: "user", content: prompt }],
          response_format: zodResponseFormat(
            transcriptAnalysisSchema,
            "transcript_analysis"
          ),
        });
        const parsedMessage = completion.choices[0]?.message.parsed;

        if (!parsedMessage) {
          return err(
            new Error("AI transcript analysis returned no parsed payload")
          );
        }

        return ok(parsedMessage);
      } catch (error: unknown) {
        return err(
          error instanceof Error
            ? error
            : new Error("Transcript analysis failed")
        );
      }
    })
    .exhaustive();
};
