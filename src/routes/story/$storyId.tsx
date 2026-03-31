import { useIsMutating, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatRelative } from "date-fns";

import { AudioPlayback } from "#/components/audio-playback";
import { ErrorInstanceItem } from "#/components/error-instance-item";
import {
  getReanalyseStoryMutationKey,
  StoryActions,
} from "#/components/story-actions";
import { Button } from "#/components/ui/button";
import { orpc } from "#/orpc/client";

export const Route = createFileRoute("/story/$storyId")({
  component: StoryDetail,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        orpc.recording.getRecording.queryOptions({
          input: { id: params.storyId },
        })
      ),
      context.queryClient.ensureQueryData(
        orpc.errorInstance.getErrorInstancesForRecording.queryOptions({
          input: { recordingId: params.storyId },
        })
      ),
    ]);
  },
});

function StoryDetail() {
  const { storyId } = Route.useParams();
  const reanalyseStoryMutationCount = useIsMutating({
    mutationKey: getReanalyseStoryMutationKey(storyId),
  });
  const isReanalysing = reanalyseStoryMutationCount > 0;

  const { data: story } = useSuspenseQuery(
    orpc.recording.getRecording.queryOptions({ input: { id: storyId } })
  );

  const { data: errors } = useSuspenseQuery(
    orpc.errorInstance.getErrorInstancesForRecording.queryOptions({
      input: { recordingId: storyId },
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

      {isReanalysing && <p className="font-medium">Re-analysing story...</p>}

      <div
        aria-busy={isReanalysing}
        className={isReanalysing ? "pointer-events-none opacity-60" : undefined}
      >
        <AudioPlayback url={story.audioUrl} />

        <h2>Errors</h2>
        <div>
          {errors.map((error) => (
            <ErrorInstanceItem
              key={error.id}
              error={error}
              audioUrl={story.audioUrl}
            />
          ))}
        </div>

        <h2>Transcript</h2>
        <p>{story.transcript}</p>
      </div>
    </div>
  );
}
