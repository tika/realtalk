import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useReducer, useRef, useState } from "react";

import { logError, logInfo } from "#/lib/observability";
import { uploadAudio } from "#/lib/upload-audio";
import { orpc } from "#/orpc/client";

export type Mode = "single" | "reinforce";

export type State =
  | { stage: "mode-selection" }
  | { stage: "prompt-selection"; mode: Mode }
  | { stage: "recording-story"; mode: Mode; prompt: string; seriesId?: string }
  | { stage: "uploading"; mode: Mode; prompt: string; seriesId?: string }
  | { stage: "analysing"; mode: Mode; prompt: string; seriesId?: string }
  | {
      stage: "error";
      mode: Mode;
      prompt: string;
      seriesId?: string;
      message: string;
    };

type Action =
  | { type: "mode-selected"; mode: Mode }
  | { type: "prompt-selected"; prompt: string }
  | { type: "recording-finished" }
  | { type: "upload-complete" }
  | { type: "failed"; message: string }
  | { type: "reset" };

export interface InitParams {
  mode?: Mode;
  seriesId?: string;
  prompt?: string;
}

export const getInitialState = (params: InitParams): State => {
  if (params.seriesId && params.prompt) {
    return {
      stage: "recording-story",
      mode: "reinforce",
      prompt: params.prompt,
      seriesId: params.seriesId,
    };
  }
  if (params.mode) {
    return { stage: "prompt-selection", mode: params.mode };
  }
  return { stage: "mode-selection" };
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "mode-selected": {
      return { stage: "prompt-selection", mode: action.mode };
    }
    case "prompt-selected": {
      if (state.stage !== "prompt-selection") {
        return state;
      }
      return {
        stage: "recording-story",
        mode: state.mode,
        prompt: action.prompt,
      };
    }
    case "recording-finished": {
      if (state.stage !== "recording-story") {
        return state;
      }
      return {
        stage: "uploading",
        mode: state.mode,
        prompt: state.prompt,
        seriesId: state.seriesId,
      };
    }
    case "upload-complete": {
      if (state.stage !== "uploading") {
        return state;
      }
      return {
        stage: "analysing",
        mode: state.mode,
        prompt: state.prompt,
        seriesId: state.seriesId,
      };
    }
    case "failed": {
      if (!("prompt" in state)) {
        return state;
      }
      return {
        stage: "error",
        mode: state.mode,
        prompt: state.prompt,
        seriesId: "seriesId" in state ? state.seriesId : undefined,
        message: action.message,
      };
    }
    case "reset": {
      return { stage: "mode-selection" };
    }
    default: {
      return state;
    }
  }
};

export function useNewStory(params: InitParams) {
  const [state, dispatch] = useReducer(reducer, params, getInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [dialogOpen, setDialogOpen] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createSeries = useMutation(
    orpc.series.createSeries.mutationOptions({})
  );

  const createRecording = useMutation(
    orpc.recording.createRecording.mutationOptions({
      onSuccess: async (recording) => {
        logInfo("recording.create.success", { recordingId: recording.id });
        await queryClient.invalidateQueries({
          queryKey: orpc.recording.getAllRecordings.queryOptions({ input: {} })
            .queryKey,
        });
        await navigate({
          to: "/story/$storyId",
          params: { storyId: recording.id },
        });
      },
      onError: (error) => {
        logError("recording.create.error", {
          error,
          prompt: "prompt" in stateRef.current ? stateRef.current.prompt : null,
          stage: stateRef.current.stage,
        });
        dispatch({ type: "failed", message: error.message });
      },
    })
  );

  const handleModeSelected = (mode: Mode) => {
    dispatch({ type: "mode-selected", mode });
  };

  const selectPrompt = (prompt: string) => {
    dispatch({ type: "prompt-selected", prompt });
  };

  const finishRecording = async (blob: Blob) => {
    const { current } = stateRef;
    if (!("prompt" in current)) {
      return;
    }

    logInfo("recording.finish", { size: blob.size, type: blob.type });
    dispatch({ type: "recording-finished" });

    try {
      const audioKey = await uploadAudio(blob);
      logInfo("upload.complete", { audioKey });
      dispatch({ type: "upload-complete" });

      if (current.mode === "reinforce") {
        const existingSeriesId =
          "seriesId" in current ? current.seriesId : undefined;

        if (existingSeriesId) {
          createRecording.mutate({
            audioKey,
            prompt: current.prompt,
            seriesId: existingSeriesId,
          });
        } else {
          const newSeries = await createSeries.mutateAsync({
            title: current.prompt,
          });
          createRecording.mutate({
            audioKey,
            prompt: current.prompt,
            seriesId: newSeries.id,
          });
        }
      } else {
        createRecording.mutate({ audioKey, prompt: current.prompt });
      }
    } catch (error: unknown) {
      logError("upload.error", { error });
      dispatch({
        type: "failed",
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  const reset = () => dispatch({ type: "reset" });
  const openDialog = () => setDialogOpen(true);

  return {
    state,
    dialogOpen,
    setDialogOpen,
    handleModeSelected,
    selectPrompt,
    finishRecording,
    reset,
    openDialog,
  };
}
