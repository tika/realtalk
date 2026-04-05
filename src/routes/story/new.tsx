import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useReducer, useRef, useState } from "react";
import * as z from "zod";

import { NewStoryDialog } from "#/components/new-story-dialog";
import { RecordStory } from "#/components/record-story";
import { Button } from "#/components/ui/button";
import { logError, logInfo } from "#/lib/observability";
import { orpc } from "#/orpc/client";

const searchSchema = z.object({
  mode: z.enum(["single", "reinforce"]).optional(),
  seriesId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/story/new")({
  component: NewStory,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ seriesId: search.seriesId }),
  loader: async ({ context, deps }) => {
    if (!deps.seriesId) {
      return { series: null };
    }
    const series = await context.queryClient.fetchQuery(
      orpc.series.getSeries.queryOptions({ input: { id: deps.seriesId } })
    );
    return { series };
  },
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
}) => (
  <Button onClick={() => onSelect(prompt)} type="button">
    {prompt}
  </Button>
);

type Mode = "single" | "reinforce";

type State =
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

interface InitParams {
  mode?: Mode;
  seriesId?: string;
  prompt?: string;
}

const getInitialState = (params: InitParams): State => {
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
  const { mode, seriesId } = Route.useSearch();
  const { series } = Route.useLoaderData();

  const [state, dispatch] = useReducer(
    reducer,
    { mode, seriesId, prompt: series?.title },
    getInitialState
  );
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
        logInfo("recording.create.success", {
          recordingId: recording.id,
        });
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

  const handleModeSelected = (modeSelected: Mode) => {
    dispatch({ type: "mode-selected", mode: modeSelected });
  };

  const selectPrompt = (prompt: string) => {
    dispatch({ type: "prompt-selected", prompt });
  };

  const finishRecording = async (blob: Blob) => {
    const { current } = stateRef;
    if (!("prompt" in current)) {
      return;
    }

    logInfo("recording.finish", {
      size: blob.size,
      type: blob.type,
    });
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

  const reset = () => {
    dispatch({ type: "reset" });
  };

  const openDialog = () => {
    setDialogOpen(true);
  };

  return (
    <main>
      <div>
        {state.stage === "mode-selection" && (
          <>
            <h1>New story</h1>
            <Button type="button" onClick={openDialog}>
              Get started
            </Button>
            <NewStoryDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onSelect={handleModeSelected}
            />
          </>
        )}
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
