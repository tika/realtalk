import { MoreVerticalCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatRelative } from "date-fns";

import { AudioPlayback } from "#/components/audio-playback";
import { ErrorInstanceItem } from "#/components/error-instance-item";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stories } = useSuspenseQuery(
    orpc.story.getStory.queryOptions({ input: { id: storyId } })
  );
  const story = stories[0];

  const { data: errors } = useSuspenseQuery(
    orpc.errorInstance.getErrorInstancesForStory.queryOptions({
      input: { storyId },
    })
  );

  const deleteStory = useMutation(
    orpc.story.deleteStory.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.story.getAllStories.queryOptions({ input: {} }).queryKey,
        });
        await navigate({ to: "/" });
      },
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

        <Button
          onClick={() => deleteStory.mutate({ id: storyId })}
          disabled={deleteStory.isPending}
        >
          <HugeiconsIcon icon={MoreVerticalCircle01Icon} />
        </Button>
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
