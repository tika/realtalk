import { useCallback, useEffect, useRef, useState } from "react";

export type RecordingStatus = "idle" | "recording" | "paused";

export const useAudioRecorder = ({
  onFinish,
}: {
  onFinish: (recording: Blob) => void;
}) => {
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("idle");
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const elapsedBeforeCurrentSegmentRef = useRef(0);
  const currentSegmentStartedAtRef = useRef<number | null>(null);
  const shouldDiscardRecordingRef = useRef(false);

  useEffect(() => {
    if (recordingStatus === "idle") {
      return;
    }

    // The visible timer only counts active recording time, so we combine
    // previously completed segments with the current in-progress segment
    const intervalId = window.setInterval(() => {
      const elapsedWhileRecording =
        recordingStatus === "recording" && currentSegmentStartedAtRef.current
          ? Date.now() - currentSegmentStartedAtRef.current
          : 0;

      setElapsedMilliseconds(
        elapsedBeforeCurrentSegmentRef.current + elapsedWhileRecording
      );
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [recordingStatus]);

  const resetRecorderState = useCallback(() => {
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    shouldDiscardRecordingRef.current = false;
    elapsedBeforeCurrentSegmentRef.current = 0;
    currentSegmentStartedAtRef.current = null;
    setElapsedMilliseconds(0);
    setRecordingStatus("idle");
  }, []);

  const stopMediaStream = useCallback(() => {
    for (const track of mediaStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    mediaStreamRef.current = null;
  }, []);

  useEffect(
    () => () => {
      // Releasing tracks on unmount turns off the microphone indicator and
      // avoids leaving the browser stream alive after the UI disappears
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }

      stopMediaStream();
    },
    [stopMediaStream]
  );

  const startRecording = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setErrorMessage("Audio recording is not supported in this browser.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setErrorMessage("This browser does not support audio recording.");
      return;
    }

    try {
      setErrorMessage(undefined);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];
      shouldDiscardRecordingRef.current = false;
      elapsedBeforeCurrentSegmentRef.current = 0;
      currentSegmentStartedAtRef.current = Date.now();
      setElapsedMilliseconds(0);

      // MediaRecorder emits chunks over time and across pause/resume cycles
      // We keep them all so finish can return one combined audio blob
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      });

      // We keep every chunk in memory so pause/resume still produces one
      // combined blob when the user finishes
      mediaRecorder.addEventListener("stop", () => {
        const recording = new Blob(recordingChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        stopMediaStream();
        const shouldDiscard = shouldDiscardRecordingRef.current;
        resetRecorderState();

        if (!shouldDiscard && recording.size > 0) {
          onFinish(recording);
        }
      });

      mediaRecorder.start();
      setRecordingStatus("recording");
    } catch {
      setErrorMessage(
        "Microphone access was denied. Please allow it and try again."
      );
      stopMediaStream();
      resetRecorderState();
    }
  }, [onFinish, resetRecorderState, stopMediaStream]);

  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || recordingStatus !== "recording") {
      return;
    }

    // Closing out the active segment here prevents paused time from being
    // counted in the elapsed duration shown to the user
    const currentSegmentStartedAt = currentSegmentStartedAtRef.current;
    if (currentSegmentStartedAt) {
      elapsedBeforeCurrentSegmentRef.current +=
        Date.now() - currentSegmentStartedAt;
    }

    currentSegmentStartedAtRef.current = null;
    setElapsedMilliseconds(elapsedBeforeCurrentSegmentRef.current);
    mediaRecorder.pause();
    setRecordingStatus("paused");
  }, [recordingStatus]);

  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || recordingStatus !== "paused") {
      return;
    }

    currentSegmentStartedAtRef.current = Date.now();
    mediaRecorder.resume();
    setRecordingStatus("recording");
  }, [recordingStatus]);

  const finishRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      return;
    }

    // Duration is tracked outside the recorder because paused time should not
    // count toward the visible timer
    if (recordingStatus === "recording" && currentSegmentStartedAtRef.current) {
      elapsedBeforeCurrentSegmentRef.current +=
        Date.now() - currentSegmentStartedAtRef.current;
    }

    currentSegmentStartedAtRef.current = null;
    setElapsedMilliseconds(elapsedBeforeCurrentSegmentRef.current);
    mediaRecorder.stop();
  }, [recordingStatus]);

  const cancelRecording = useCallback(() => {
    shouldDiscardRecordingRef.current = true;

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      stopMediaStream();
      resetRecorderState();
      return;
    }

    if (mediaRecorder.state === "inactive") {
      stopMediaStream();
      resetRecorderState();
      return;
    }

    mediaRecorder.stop();
  }, [resetRecorderState, stopMediaStream]);

  return {
    cancelRecording,
    elapsedMilliseconds,
    errorMessage,
    finishRecording,
    pauseRecording,
    recordingStatus,
    resumeRecording,
    startRecording,
  };
};
