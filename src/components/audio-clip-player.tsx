import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "#/components/ui/button";

interface AudioClipPlayerProps {
  audioBlob?: Blob;
  audioUrl?: string;
  endTimeMs: number;
  startTimeMs: number;
}

const formatTime = (timeInSeconds: number) => {
  const safeTime = Number.isFinite(timeInSeconds)
    ? Math.max(0, timeInSeconds)
    : 0;
  const minutes = Math.floor(safeTime / 60);
  const seconds = Math.floor(safeTime % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const AudioClipPlayer = ({
  audioBlob,
  audioUrl,
  endTimeMs,
  startTimeMs,
}: AudioClipPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState(audioUrl ?? "");
  const [isPlaying, setIsPlaying] = useState(false);
  const clipStart = Math.max(0, startTimeMs / 1000);
  const clipEnd = Math.max(clipStart, endTimeMs / 1000);
  const clipDuration = clipEnd - clipStart;

  useEffect(() => {
    if (audioUrl) {
      setResolvedAudioUrl(audioUrl);
      return;
    }

    if (!audioBlob) {
      setResolvedAudioUrl("");
      return;
    }

    const nextAudioUrl = URL.createObjectURL(audioBlob);
    setResolvedAudioUrl(nextAudioUrl);

    return () => {
      URL.revokeObjectURL(nextAudioUrl);
    };
  }, [audioBlob, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const seekToClipStart = () => {
      audio.currentTime = clipStart;
    };

    const handleTimeUpdate = () => {
      if (audio.currentTime < clipStart) {
        audio.currentTime = clipStart;
        return;
      }

      if (audio.currentTime >= clipEnd) {
        audio.pause();
        audio.currentTime = clipStart;
      }
    };

    const handlePlay = () => {
      if (audio.currentTime < clipStart || audio.currentTime >= clipEnd) {
        audio.currentTime = clipStart;
      }
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", seekToClipStart);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    if (audio.readyState >= 1) {
      seekToClipStart();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", seekToClipStart);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [clipEnd, clipStart, resolvedAudioUrl]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    if (audio.currentTime < clipStart || audio.currentTime >= clipEnd) {
      audio.currentTime = clipStart;
    }

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, [clipEnd, clipStart, isPlaying]);

  return (
    <div className="flex items-center gap-3">
      <audio ref={audioRef} src={resolvedAudioUrl} preload="metadata">
        <track kind="captions" />
      </audio>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={togglePlayback}
        disabled={!resolvedAudioUrl}
        aria-label={isPlaying ? "Pause audio clip" : "Play audio clip"}
      >
        <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} />
      </Button>
      <div className="text-sm tabular-nums text-muted-foreground">
        {formatTime(clipStart)} - {formatTime(clipEnd)}
        {clipDuration > 0 ? ` (${formatTime(clipDuration)})` : ""}
      </div>
    </div>
  );
};
