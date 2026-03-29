import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

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

function NewStory() {
  const [stage, setStage] = useState<
    "prompt-selection" | "recording-story" | "analysing"
  >("prompt-selection");
  const [selectedPrompt, setSelectedPrompt] = useState<string>();

  const selectPrompt = useCallback((prompt: string) => {
    setSelectedPrompt(prompt);
    setStage("recording-story");
  }, []);

  const finishRecording = useCallback((_recording: Blob) => {
    // TODO: chuck the audio to the backend
    setStage("analysing");
  }, []);

  return (
    <main>
      <div>
        {stage === "prompt-selection" && (
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
        {stage === "recording-story" && (
          <>
            <h1>Record your story</h1>
            <h2>{selectedPrompt}</h2>
            <RecordStory onFinish={finishRecording} />
          </>
        )}
        {stage === "analysing" && <h1>Analysing your story...</h1>}
      </div>
    </main>
  );
}
