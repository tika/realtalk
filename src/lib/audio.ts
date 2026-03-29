import { match } from "ts-pattern";

import { err, ok } from "#/lib/result";
import type { Result } from "#/lib/result";

/**
 * Maps a response MIME type to a file extension that the transcription API
 * understands. This keeps upload filename generation in one place instead of
 * scattering MIME heuristics through route code.
 */
export const getAudioExtensionFromMimeType = (mimeType: string) =>
  match(mimeType)
    .with("audio/mp3", "audio/mpeg", () => "mp3")
    .with("audio/mp4", "audio/m4a", () => "m4a")
    .with("audio/ogg", () => "ogg")
    .with("audio/wav", "audio/x-wav", () => "wav")
    .with("audio/webm", "video/webm", () => "webm")
    .otherwise(() => "webm");

/**
 * Loads an audio asset from a server-accessible URL and wraps it in a File so
 * the OpenAI/OpenRouter transcription client can upload it as multipart form
 * data.
 */
export const fetchAudioFileFromUrl = async (
  audioUrl: string
): Promise<Result<File>> => {
  if (!URL.canParse(audioUrl)) {
    return err(new Error("audioUrl must be an absolute URL"));
  }

  if (audioUrl.startsWith("blob:")) {
    return err(
      new Error(
        "audioUrl must be a server-accessible URL. Browser blob: URLs cannot be fetched from the server."
      )
    );
  }

  try {
    const response = await fetch(audioUrl);

    if (!response.ok) {
      return err(
        new Error(
          `Failed to fetch audio from ${audioUrl}: ${response.status} ${response.statusText}`
        )
      );
    }

    const mimeType = response.headers.get("content-type") ?? "audio/webm";
    const extension = getAudioExtensionFromMimeType(mimeType);
    const audioBuffer = await response.arrayBuffer();

    return ok(
      new File([audioBuffer], `story-recording.${extension}`, {
        type: mimeType,
      })
    );
  } catch (error: unknown) {
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to fetch audio file from URL")
    );
  }
};
