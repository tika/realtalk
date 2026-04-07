import { SignInButton } from "@clerk/tanstack-react-start";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { client, orpc } from "#/orpc/client";

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
    if (!word) {return;}
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

const Dashboard = () => {
  const [newTopicName, setNewTopicName] = useState("");
  const [editingTopic, setEditingTopic] = useState<{
    id: string;
    name: string;
    words: string[];
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: topics } = useSuspenseQuery(
    orpc.topic.getAllTopics.queryOptions({ input: {} })
  );

  const createTopic = useMutation({
    mutationFn: (name: string) => client.topic.createTopic({ name }),
    onSuccess: () => {
      setNewTopicName("");
      queryClient.invalidateQueries({
        queryKey: orpc.topic.getAllTopics.queryOptions({ input: {} }).queryKey,
      });
    },
  });

  return (
    <main>
      <h1 className="font-bold">Realtalk</h1>

      <div className="mt-6">
        <h2 className="text-lg font-medium">Topics</h2>

        <form
          className="flex gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (newTopicName.trim()) {
              createTopic.mutate(newTopicName.trim());
            }
          }}
        >
          <Input
            placeholder="New topic name"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
          />
          <Button
            type="submit"
            disabled={!newTopicName.trim() || createTopic.isPending}
          >
            {createTopic.isPending ? "Creating…" : "Add"}
          </Button>
        </form>

        {topics.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            No topics yet. Create one above to start practicing.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between rounded-2xl border border-border p-4"
              >
                <button
                  type="button"
                  className="text-left"
                  onClick={() => setEditingTopic(topic)}
                >
                  <p className="font-medium">{topic.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {topic.words.length} words
                  </p>
                </button>
                <Link to="/story/new" search={{ topicId: topic.id }}>
                  <Button variant="outline">New story</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingTopic && (
        <EditWordsDialog
          topic={editingTopic}
          onClose={() => setEditingTopic(null)}
        />
      )}
    </main>
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

  return <Dashboard />;
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
      await context.queryClient.ensureQueryData(
        orpc.topic.getAllTopics.queryOptions({ input: {} })
      );
    }
  },
});
