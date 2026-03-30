import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatRelative } from "date-fns";

import { AudioPlayback } from "#/components/audio-playback";
import { ErrorInstanceItem } from "#/components/error-instance-item";
import { StoryActions } from "#/components/story-actions";
import { Button } from "#/components/ui/button";
import { orpc } from "#/orpc/client";

export const Route = createFileRoute("/story/$storyId")({
  component: StoryDetail,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        orpc.story.getStory.queryOptions({ input: { id: params.storyId } })
      ),
      context.queryClient.ensureQueryData(
        orpc.errorInstance.getErrorInstancesForStory.queryOptions({
          input: { storyId: params.storyId },
        })
      ),
    ]);
  },
});

function StoryDetail() {
  const { storyId } = Route.useParams();

  const { data: story } = useSuspenseQuery(
    orpc.story.getStory.queryOptions({ input: { id: storyId } })
  );

  const { data: errors } = useSuspenseQuery(
    orpc.errorInstance.getErrorInstancesForStory.queryOptions({
      input: { storyId },
    })
  );

  if (!story) {
    return <p>Story not found.</p>;
  }

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
        <StoryActions storyId={story.id} />
      </div>

      <AudioPlayback url={story.audioUrl} />

      <h2>Errors</h2>
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
