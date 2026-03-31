import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { StoryListItem } from "#/components/story-list-item";
import { Button } from "#/components/ui/button";
import { orpc } from "#/orpc/client";

const App = () => {
  const { data: recordings } = useSuspenseQuery(
    orpc.recording.getAllRecordings.queryOptions({ input: {} })
  );

  return (
    <main>
      <div className="flex flex-row justify-between items-center">
        <h1 className="font-bold">Realtalk</h1>
        <Link to="/story/new">
          <Button>New story</Button>
        </Link>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {recordings.map((recording) => (
          <Link
            key={recording.id}
            to="/story/$storyId"
            params={{ storyId: recording.id }}
          >
            <StoryListItem story={recording} />
          </Link>
        ))}
      </div>
    </main>
  );
};

export const Route = createFileRoute("/")({
  component: App,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      orpc.recording.getAllRecordings.queryOptions({ input: {} })
    );
  },
});
