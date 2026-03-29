import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ScrubBarContainer,
  ScrubBarProgress,
  ScrubBarThumb,
  ScrubBarTimeLabel,
  ScrubBarTrack,
} from "@/components/ui/scrub-bar";

import { BarVisualizer } from "./ui/bar-visualizer";
import { Button } from "./ui/button";

export const AudioPlayback = ({ url }: { url: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    // Reset state for new audio source
    setCurrentTime(0);
    setIsPlaying(false);

    // Handle case where metadata is already loaded (cached audio)
    if (audio.readyState >= 1) {
      setDuration(audio.duration);
    } else {
      setDuration(0);
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [url]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) {
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const scrubTo = useCallback((time: number) => {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const mediaStreamResources = useMemo(() => {
    const audio = new Audio(url);
    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const dest = context.createMediaStreamDestination();
    source.connect(dest);

    return { stream: dest.stream, context, audio };
  }, [url]);

  useEffect(
    () => () => {
      mediaStreamResources.context.close();
      mediaStreamResources.audio.src = "";
    },
    [mediaStreamResources]
  );

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={url} preload="metadata">
        <track kind="captions" />
      </audio>
      <Button onClick={togglePlayback} size="icon">
        <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} />
      </Button>
      <BarVisualizer
        state={isPlaying ? "listening" : "thinking"}
        barCount={30}
        mediaStream={mediaStreamResources.stream}
      />
      <ScrubBarContainer
        duration={duration}
        value={currentTime}
        onScrub={scrubTo}
      >
        <ScrubBarTimeLabel time={currentTime} />
        <ScrubBarTrack className="mx-2">
          <ScrubBarProgress />
          <ScrubBarThumb />
        </ScrubBarTrack>
        <ScrubBarTimeLabel time={duration} />
      </ScrubBarContainer>
    </div>
  );
};
