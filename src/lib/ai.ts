import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { match } from "ts-pattern";
import { z } from "zod";

import { fetchAudioFileFromUrl } from "#/lib/audio";
import { env } from "#/lib/env";
import { logError, logInfo } from "#/lib/observability";
import { err, ok } from "#/lib/result";
import type { Result } from "#/lib/result";
import { transcriptWordSchema } from "#/lib/transcript";
import type { TranscriptWord } from "#/lib/transcript";
import { transcriptAnalysisSchema } from "#/lib/transcript-analysis";

import { sttPrompt, targetLang } from "./consts";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const TRANSCRIPTION_MODEL = "whisper-1";
const ANALYSIS_MODEL = "openai/gpt-5";

const openai = new OpenAI({ apiKey: env.OPENAI_KEY });
const openrouter = new OpenAI({
  apiKey: env.OPENROUTER_KEY,
  baseURL: OPENROUTER_BASE_URL,
});

export const transcribeAudioFromUrl = async (
  audioUrl: string
): Promise<Result<{ text: string; words: TranscriptWord[] }>> => {
  logInfo("transcription.start", { audioUrl, model: TRANSCRIPTION_MODEL });

  const fileResult = await fetchAudioFileFromUrl(audioUrl);

  return await match(fileResult)
    .with({ success: false }, ({ error }) => {
      logError("transcription.audio-fetch.error", {
        audioUrl,
        error,
        model: TRANSCRIPTION_MODEL,
      });
      return err(error);
    })
    .with({ success: true }, async ({ data: file }) => {
      try {
        const transcription = await openai.audio.transcriptions.create({
          file,
          model: TRANSCRIPTION_MODEL,
          response_format: "verbose_json",
          timestamp_granularities: ["word"],
          prompt: sttPrompt[targetLang],
        });

        logInfo("transcription.success", {
          audioUrl,
          model: TRANSCRIPTION_MODEL,
          textLength: transcription.text.length,
          wordCount: transcription.words?.length ?? 0,
        });

        return ok({
          text: transcription.text,
          words: z.array(transcriptWordSchema).parse(transcription.words ?? []),
        });
      } catch (error: unknown) {
        logError("transcription.error", {
          audioUrl,
          error,
          model: TRANSCRIPTION_MODEL,
        });
        return err(
          error instanceof Error
            ? error
            : new Error("Audio transcription failed")
        );
      }
    })
    .exhaustive();
};

export const analyzeTranscript = async (
  prompt: string
): Promise<Result<z.infer<typeof transcriptAnalysisSchema>>> => {
  try {
    logInfo("transcript-analysis.start", {
      model: ANALYSIS_MODEL,
      promptLength: prompt.length,
    });
    const completion = await openrouter.chat.completions.parse({
      model: ANALYSIS_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(
        transcriptAnalysisSchema,
        "transcript_analysis"
      ),
    });
    const parsedMessage = completion.choices[0]?.message.parsed;

    if (!parsedMessage) {
      logError("transcript-analysis.empty-payload", { model: ANALYSIS_MODEL });
      return err(
        new Error("AI transcript analysis returned no parsed payload")
      );
    }

    logInfo("transcript-analysis.success", {
      errorCount: parsedMessage.errors.length,
      model: ANALYSIS_MODEL,
    });
    return ok(parsedMessage);
  } catch (error: unknown) {
    logError("transcript-analysis.error", { error, model: ANALYSIS_MODEL });
    return err(
      error instanceof Error ? error : new Error("Transcript analysis failed")
    );
  }
};
