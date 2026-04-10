import { SignInButton } from "@clerk/tanstack-react-start";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatRelative } from "date-fns";
import { useState } from "react";

import { OnboardingDialog } from "#/components/onboarding-dialog";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import type { SupportedLanguage } from "#/lib/consts";
import { languageFlag } from "#/lib/consts";
import { client, orpc } from "#/orpc/client";

const Landing = () => (
  <main>
    <h2 className="text-2xl font-bold">Welcome to Realtalk</h2>
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

const EditWordsDialog = ({
  topic,
  onClose,
}: {
  topic: { id: string; name: string; words: string[] };
  onClose: () => void;
}) => {
  const [wordInput, setWordInput] = useState("");
  const queryClient = useQueryClient();

  const editTopic = useMutation({
    mutationFn: (words: string[]) =>
      client.topic.editTopic({ id: topic.id, words }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.topic.getAllTopics.queryOptions({ input: {} }).queryKey,
      });
    },
  });

  const addWord = () => {
    const word = wordInput.trim();
    if (!word) {
      return;
    }
    editTopic.mutate([...topic.words, word]);
    setWordInput("");
  };

  const removeWord = (index: number) => {
    editTopic.mutate(topic.words.filter((_, i) => i !== index));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{topic.name} — Words</DialogTitle>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addWord();
          }}
        >
          <Input
            placeholder="Add a word"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
          />
          <Button
            type="submit"
            disabled={!wordInput.trim() || editTopic.isPending}
          >
            Add
          </Button>
        </form>
        {topic.words.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topic.words.map((word, i) => {
              const wordKey = `${word}-${i}`;
              return (
                <button
                  key={wordKey}
                  type="button"
                  className="rounded-full bg-secondary px-3 py-1 text-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
                  onClick={() => removeWord(i)}
                  title="Click to remove"
                >
                  {word} ×
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AddTopicDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const createTopic = useMutation({
    mutationFn: (topicName: string) =>
      client.topic.createTopic({ name: topicName }),
    onSuccess: () => {
      setName("");
      onOpenChange(false);
      queryClient.invalidateQueries({
        queryKey: orpc.topic.getAllTopics.queryOptions({ input: {} }).queryKey,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New topic</DialogTitle>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              createTopic.mutate(name.trim());
            }
          }}
        >
          <Input
            placeholder="Topic name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="submit"
            disabled={!name.trim() || createTopic.isPending}
          >
            {createTopic.isPending ? "Creating…" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const RecentStories = () => {
  const { data: recordings } = useSuspenseQuery(
    orpc.recording.getAllRecordings.queryOptions({ input: {} })
  );

  const recent = recordings
    .toSorted(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  if (recent.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {recent.map((story) => (
        <Link
          key={story.id}
          to="/story/$storyId"
          params={{ storyId: story.id }}
          className="rounded-2xl border border-border p-4 hover:bg-secondary/50 transition-colors"
        >
          <p className="font-medium truncate">{story.prompt}</p>
          {story.summary && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {story.summary}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {formatRelative(story.createdAt, new Date())}
          </p>
        </Link>
      ))}
    </div>
  );
};

const Dashboard = ({ targetLanguage }: { targetLanguage: string }) => {
  const [editingTopic, setEditingTopic] = useState<{
    id: string;
    name: string;
    words: string[];
  } | null>(null);
  const [addTopicOpen, setAddTopicOpen] = useState(false);

  const { data: topics } = useSuspenseQuery(
    orpc.topic.getAllTopics.queryOptions({ input: {} })
  );

  const flag = languageFlag[targetLanguage as SupportedLanguage] ?? "🌍";

  return (
    <main>
      <p className="text-3xl mb-8">{flag}</p>

      <RecentStories />

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Topics</h2>
          <Button variant="outline" onClick={() => setAddTopicOpen(true)}>
            Add topic
          </Button>
        </div>

        {topics.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            No topics yet. Create one to start practicing.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between rounded-2xl border border-border p-4"
              >
                <div>
                  <p className="font-medium">
                    <span className="text-muted-foreground">
                      {topic.words.length}w
                    </span>{" "}
                    {topic.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setEditingTopic(topic)}
                  >
                    Edit
                  </Button>
                  <Link to="/story/new" search={{ topicId: topic.id }}>
                    <Button>Record</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Stories</h2>
        <StoriesList />
      </section>

      <AddTopicDialog open={addTopicOpen} onOpenChange={setAddTopicOpen} />

      {editingTopic && (
        <EditWordsDialog
          topic={editingTopic}
          onClose={() => setEditingTopic(null)}
        />
      )}
    </main>
  );
};

const StoriesList = () => {
  const { data: recordings } = useSuspenseQuery(
    orpc.recording.getAllRecordings.queryOptions({ input: {} })
  );

  const sorted = recordings.toSorted(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="mt-4 text-muted-foreground">
        No stories yet. Record one to get started.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
      {sorted.map((story) => (
        <Link
          key={story.id}
          to="/story/$storyId"
          params={{ storyId: story.id }}
          className="flex items-center justify-between rounded-2xl border border-border p-4 hover:bg-secondary/50 transition-colors"
        >
          <div>
            <p className="font-medium">{story.prompt}</p>
            {story.summary && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {story.summary}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground whitespace-nowrap ml-4">
            {formatRelative(story.createdAt, new Date())}
          </p>
        </Link>
      ))}
    </div>
  );
};

const AuthedApp = () => {
  const queryClient = useQueryClient();

  const { data: dbUser } = useSuspenseQuery(
    orpc.user.getUser.queryOptions({ input: {} })
  );

  if (!dbUser) {
    return (
      <OnboardingDialog
        onComplete={() => {
          queryClient.invalidateQueries({
            queryKey: orpc.user.getUser.queryOptions({ input: {} }).queryKey,
          });
        }}
      />
    );
  }

  return <Dashboard targetLanguage={dbUser.targetLanguage} />;
};

const App = () => {
  const { userId } = Route.useRouteContext();
  if (!userId) {
    return <Landing />;
  }
  return <AuthedApp />;
};

export const Route = createFileRoute("/")({
  component: App,
  loader: async ({ context }) => {
    if (!context.userId) {
      return;
    }
    const user = await context.queryClient.ensureQueryData(
      orpc.user.getUser.queryOptions({ input: {} })
    );
    if (user) {
      await Promise.all([
        context.queryClient.ensureQueryData(
          orpc.topic.getAllTopics.queryOptions({ input: {} })
        ),
        context.queryClient.ensureQueryData(
          orpc.recording.getAllRecordings.queryOptions({ input: {} })
        ),
      ]);
    }
  },
});
