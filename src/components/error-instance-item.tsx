import type { ErrorInstance } from "#/db/schema.ts";

import { AudioClipPlayer } from "./audio-clip-player";

export const ErrorInstanceItem = ({
  error,
  audioUrl,
}: {
  error: ErrorInstance;
  audioUrl: string;
}) => (
  <div className="p-4 border rounded-md space-y-2">
    <span className="capitalize">{error.errorType}</span>
    <p>{error.severity}</p>
    <p className="text-red-500">{error.originalText}</p>
    <p className="text-green-500">{error.correctedText}</p>
    <AudioClipPlayer
      audioUrl={audioUrl}
      startTimeMs={error.startTimeMs}
      endTimeMs={error.endTimeMs}
    />
  </div>
);
