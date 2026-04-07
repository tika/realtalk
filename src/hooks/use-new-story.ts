import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useReducer, useRef, useState } from "react";

import { logError, logInfo } from "#/lib/observability";
import { uploadAudio } from "#/lib/upload-audio";
import { orpc } from "#/orpc/client";

export type State =
  | { stage: "topic-selection" }
  | { stage: "prompt-selection"; topicId: string; topicWords: string[] }
  | {
      stage: "recording-story";
      topicId: string;
      prompt: string;
      targetWords: string[];
    }
  | {
      stage: "uploading";
      topicId: string;
      prompt: string;
      targetWords: string[];
    }
  | {
      stage: "analysing";
      topicId: string;
      prompt: string;
      targetWords: string[];
    }
  | {
      stage: "error";
      topicId: string;
      prompt: string;
      targetWords: string[];
      message: string;
    };

type Action =
  | { type: "topic-selected"; topicId: string; topicWords: string[] }
  | { type: "prompt-selected"; prompt: string; targetWords: string[] }
  | { type: "recording-finished" }
  | { type: "upload-complete" }
  | { type: "failed"; message: string }
  | { type: "reset" };

export interface InitParams {
  topicId?: string;
  topicWords?: string[];
  prompt?: string;
  targetWords?: string[];
}

export const getInitialState = (params: InitParams): State => {
  if (params.topicId && params.prompt && params.targetWords) {
    return {
      stage: "recording-story",
      topicId: params.topicId,
      prompt: params.prompt,
      targetWords: params.targetWords,
    };
  }
  if (params.topicId && params.topicWords) {
    return {
      stage: "prompt-selection",
      topicId: params.topicId,
      topicWords: params.topicWords,
    };
  }
  return { stage: "topic-selection" };
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "topic-selected": {
      return {
        stage: "prompt-selection",
        topicId: action.topicId,
        topicWords: action.topicWords,
      };
    }
    case "prompt-selected": {
      if (state.stage !== "prompt-selection") {
        return state;
      }
      return {
        stage: "recording-story",
        topicId: state.topicId,
        prompt: action.prompt,
        targetWords: action.targetWords,
      };
    }
    case "recording-finished": {
      if (state.stage !== "recording-story") {
        return state;
      }
      return {
        stage: "uploading",
        topicId: state.topicId,
        prompt: state.prompt,
        targetWords: state.targetWords,
      };
    }
    case "upload-complete": {
      if (state.stage !== "uploading") {
        return state;
      }
      return {
        stage: "analysing",
        topicId: state.topicId,
        prompt: state.prompt,
        targetWords: state.targetWords,
      };
    }
    case "failed": {
      if (!("prompt" in state)) {
        return state;
      }
      return {
        stage: "error",
        topicId: state.topicId,
        prompt: state.prompt,
        targetWords: state.targetWords,
        message: action.message,
      };
    }
    case "reset": {
      return { stage: "topic-selection" };
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

  const handleTopicSelected = (topicId: string, topicWords: string[]) => {
    dispatch({ type: "topic-selected", topicId, topicWords });
  };

  const selectPrompt = (prompt: string, targetWords: string[]) => {
    dispatch({ type: "prompt-selected", prompt, targetWords });
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

      createRecording.mutate({
        audioKey,
        prompt: current.prompt,
        topicId: current.topicId,
        targetWords: current.targetWords,
      });
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
    handleTopicSelected,
    selectPrompt,
    finishRecording,
    reset,
    openDialog,
  };
}
