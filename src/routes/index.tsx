import { SignInButton } from "@clerk/tanstack-react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { NewStoryDialog } from "#/components/new-story-dialog";
import { StoryListItem } from "#/components/story-list-item";
import { Button } from "#/components/ui/button";
import { orpc } from "#/orpc/client";

type Mode = "single" | "reinforce";

const Landing = () => (
  <main>
    <h1 className="text-2xl font-bold">Realtalk</h1>
    <p className="mt-2">
      Practice speaking and get feedback on your language skills.
    </p>
    <div className="mt-4">
      <SignInButton mode="modal">
        <Button>Sign in to get started</Button>
      </SignInButton>
    </div>
  </main>
);

const Dashboard = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: recordings } = useSuspenseQuery(
    orpc.recording.getAllRecordings.queryOptions({ input: {} })
  );

  const handleModeSelect = (mode: Mode) => {
    navigate({ to: "/story/new", search: { mode } });
  };

  return (
    <main>
      <div className="flex flex-row justify-between items-center">
        <h1 className="font-bold">Realtalk</h1>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          New story
        </Button>
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
      <NewStoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleModeSelect}
      />
    </main>
  );
};

const App = () => {
  const { userId } = Route.useRouteContext();
  if (!userId) {
    return <Landing />;
  }
  return <Dashboard />;
};

export const Route = createFileRoute("/")({
  component: App,
  loader: async ({ context }) => {
    if (!context.userId) {
      return;
    }
    await context.queryClient.ensureQueryData(
      orpc.recording.getAllRecordings.queryOptions({ input: {} })
    );
  },
});
