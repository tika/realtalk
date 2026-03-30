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
    <p>{error.rating}</p>
    <p className="text-red-500">{error.original_text}</p>
    <p className="text-green-500">{error.corrected_text}</p>
    <AudioClipPlayer
      audioUrl={audioUrl}
      startTimeMs={error.startTimeMs}
      endTimeMs={error.endTimeMs}
    />
  </div>
);
