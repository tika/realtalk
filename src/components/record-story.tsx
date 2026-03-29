import { Microphone, PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useAudioRecorder } from "#/hooks/use-audio-recorder";
import { formatElapsedTime } from "#/lib/utils";

import { Button } from "./ui/button";

export const RecordStory = ({
  onFinish,
}: {
  onFinish: (recording: Blob) => void;
}) => {
  const {
    cancelRecording,
    elapsedMilliseconds,
    errorMessage,
    finishRecording,
    pauseRecording,
    recordingStatus,
    resumeRecording,
    startRecording,
  } = useAudioRecorder({ onFinish });

  const isIdle = recordingStatus === "idle";
  const isRecording = recordingStatus === "recording";

  const togglePauseState = isRecording ? pauseRecording : resumeRecording;

  return (
    <div className="flex flex-col items-center gap-3">
      {isIdle ? (
        <Button onClick={startRecording} size="lg" type="button">
          <HugeiconsIcon icon={Microphone} />
          Start recording
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Button onClick={finishRecording} size="lg" type="button">
              <HugeiconsIcon icon={Microphone} />
              Finish recording
            </Button>
            <Button
              onClick={togglePauseState}
              size="icon"
              type="button"
              variant="outline"
            >
              <HugeiconsIcon icon={isRecording ? PauseIcon : PlayIcon} />
              <span className="sr-only">
                {isRecording ? "Pause recording" : "Resume recording"}
              </span>
            </Button>
            <Button
              onClick={cancelRecording}
              type="button"
              variant="destructive"
            >
              Cancel recording
            </Button>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {formatElapsedTime(elapsedMilliseconds)}
          </p>
        </>
      )}
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
};
