import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useReducer, useRef } from "react";

import { RecordStory } from "#/components/record-story";
import { Button } from "#/components/ui/button";
import { logError, logInfo } from "#/lib/observability";
import { orpc } from "#/orpc/client";

export const Route = createFileRoute("/story/new")({
  component: NewStory,
});

const prompts = [
  "Funny thing that happened on vacation",
  "Best food experience you've had",
  "Your favourite holiday",
] as const;

const PromptButton = ({
  onSelect,
  prompt,
}: {
  onSelect: (prompt: string) => void;
  prompt: string;
}) => {
  const handleClick = useCallback(() => {
    onSelect(prompt);
  }, [onSelect, prompt]);

  return (
    <Button onClick={handleClick} type="button">
      {prompt}
    </Button>
  );
};

type State =
  | { stage: "prompt-selection" }
  | { stage: "recording-story"; prompt: string }
  | { stage: "uploading"; prompt: string }
  | { stage: "analysing"; prompt: string }
  | { stage: "error"; prompt: string; message: string };

type Action =
  | { type: "prompt-selected"; prompt: string }
  | { type: "recording-finished" }
  | { type: "upload-complete" }
  | { type: "failed"; message: string }
  | { type: "reset" };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "prompt-selected": {
      return { stage: "recording-story", prompt: action.prompt };
    }
    case "recording-finished": {
      if (state.stage !== "recording-story") {
        return state;
      }
      return { stage: "uploading", prompt: state.prompt };
    }
    case "upload-complete": {
      if (state.stage !== "uploading") {
        return state;
      }
      return { stage: "analysing", prompt: state.prompt };
    }
    case "failed": {
      if (!("prompt" in state)) {
        return state;
      }
      return { stage: "error", prompt: state.prompt, message: action.message };
    }
    case "reset": {
      return { stage: "prompt-selection" };
    }
    default: {
      return state;
    }
  }
};

const uploadAudio = async (blob: Blob): Promise<string> => {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "content-type": blob.type || "audio/webm",
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const { key } = (await response.json()) as { key: string };
  return key;
};

function NewStory() {
  const [state, dispatch] = useReducer(reducer, { stage: "prompt-selection" });
  const stateRef = useRef(state);
  stateRef.current = state;

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createStory = useMutation(
    orpc.recording.createRecording.mutationOptions({
      onSuccess: async (story) => {
        logInfo("story.create.success", {
          storyId: story.id,
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.recording.getAllRecordings.queryOptions({ input: {} })
            .queryKey,
        });
        await navigate({
          to: "/story/$storyId",
          params: { storyId: story.id },
        });
      },
      onError: (error) => {
        logError("story.create.error", {
          error,
          prompt: "prompt" in stateRef.current ? stateRef.current.prompt : null,
          stage: stateRef.current.stage,
        });
        dispatch({ type: "failed", message: error.message });
      },
    })
  );

  const selectPrompt = useCallback((prompt: string) => {
    dispatch({ type: "prompt-selected", prompt });
  }, []);

  const finishRecording = useCallback(
    async (recording: Blob) => {
      const { current } = stateRef;
      if (!("prompt" in current)) {
        return;
      }

      logInfo("recording.finish", {
        size: recording.size,
        type: recording.type,
      });
      dispatch({ type: "recording-finished" });

      try {
        const audioKey = await uploadAudio(recording);
        logInfo("upload.complete", { audioKey });
        dispatch({ type: "upload-complete" });
        createStory.mutate({ audioKey, prompt: current.prompt });
      } catch (error: unknown) {
        logError("upload.error", { error });
        dispatch({
          type: "failed",
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    },
    [createStory]
  );

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  return (
    <main>
      <div>
        {state.stage === "prompt-selection" && (
          <>
            <h1>Select a prompt for your story</h1>
            <div>
              {prompts.map((prompt) => (
                <PromptButton
                  key={prompt}
                  onSelect={selectPrompt}
                  prompt={prompt}
                />
              ))}
            </div>
          </>
        )}
        {state.stage === "recording-story" && (
          <>
            <h1>Record your story</h1>
            <h2>{state.prompt}</h2>
            <RecordStory onFinish={finishRecording} />
          </>
        )}
        {state.stage === "uploading" && <h1>Uploading your recording...</h1>}
        {state.stage === "analysing" && <h1>Analysing your story...</h1>}
        {state.stage === "error" && (
          <>
            <h1>Something went wrong</h1>
            <p className="text-destructive">{state.message}</p>
            <Button onClick={reset} type="button">
              Try again
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
