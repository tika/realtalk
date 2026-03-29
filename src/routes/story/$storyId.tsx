import { MoreVerticalCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatRelative } from "date-fns";

import { Button } from "#/components/ui/button";
import type { ErrorInstance, Story } from "#/db/schema";
import { AudioPlayback } from "#/components/audio-playback";
import { ErrorInstanceItem } from "#/components/error-instance-item";


export const Route = createFileRoute("/story/$storyId")({
  component: StoryDetail,
});

// TODO: fetch the story from the backend

function StoryDetail() {
  const { storyId } = Route.useParams();

  const story: Story = {
    id: storyId,
    prompt: "Your favourite home",
    transcript: "I really enjoyed xyz",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    audioUrl: "",
    timestamps: {},
  };

  const errors: ErrorInstance[] = [
    {
      id: "okay",
      storyId: storyId,
      original_text: "Ananas",
      corrected_text: "Pineapple",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      errorType: "mistake",
      languageItemId: "123",
      startTime: new Date(),
      endTime: new Date(),
    },
  ];

  return (
    <div>
      <div className="flex flex-row justify-between items-center">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button>Back</Button>
          </Link>
          <div>
            <h1 className="text-xl">{story.prompt}</h1>
            <p>{formatRelative(story.createdAt, new Date())}</p>
          </div>
        </div>

        <Button>
          <HugeiconsIcon icon={MoreVerticalCircle01Icon} />
        </Button>
      </div>

      <AudioPlayback url={story.audioUrl} />

      <h2>
        Errors
      </h2>
      <div>
        {errors.map((error) => (
          <ErrorInstanceItem key={error.id} error={error} />
        ))}
      </div>

      <h2>Transcript</h2>
      <p>{story.transcript}</p>
    </div>
  );
}
