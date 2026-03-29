import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useReducer } from "react";

import { RecordStory } from "#/components/record-story";
import { Button } from "#/components/ui/button";

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
  | { stage: "analysing"; prompt: string };

type Action =
  | { type: "prompt-selected"; prompt: string }
  | { type: "recording-finished" }
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

      return { stage: "analysing", prompt: state.prompt };
    }
    case "reset": {
      return { stage: "prompt-selection" };
    }
    default: {
      return state;
    }
  }
};

function NewStory() {
  const [state, dispatch] = useReducer(reducer, { stage: "prompt-selection" });

  const selectPrompt = useCallback((prompt: string) => {
    dispatch({ type: "prompt-selected", prompt });
  }, []);

  const finishRecording = useCallback((_recording: Blob) => {
    // TODO: chuck the audio to the backend
    dispatch({ type: "recording-finished" });
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
        {state.stage === "analysing" && <h1>Analysing your story...</h1>}
      </div>
    </main>
  );
}
