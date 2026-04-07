import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import * as z from "zod";

import { RecordStory } from "#/components/record-story";
import { Button } from "#/components/ui/button";
import { useNewStory } from "#/hooks/use-new-story";
import type { PracticePrompt } from "#/lib/ai";
import { client, orpc } from "#/orpc/client";

const searchSchema = z.object({
  topicId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/story/new")({
  component: NewStory,
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    if (!context.userId) {
      throw redirect({ to: "/" });
    }
  },
  loaderDeps: ({ search }) => ({ topicId: search.topicId }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      orpc.topic.getAllTopics.queryOptions({ input: {} })
    );

    if (!deps.topicId) {
      return { topic: null };
    }

    const topic = await context.queryClient.fetchQuery(
      orpc.topic.getTopic.queryOptions({ input: { id: deps.topicId } })
    );
    return { topic };
  },
});

function PromptSelection({
  topicId,
  onSelect,
}: {
  topicId: string;
  onSelect: (prompt: string, targetWords: string[]) => void;
}) {
  const generatePrompts = useMutation({
    mutationFn: () => client.topic.getPrompts({ topicId }),
  });

  const prompts: PracticePrompt[] = generatePrompts.data ?? [];

  return (
    <>
      <h1 className="text-2xl font-bold">Choose a prompt</h1>

      {!generatePrompts.data && (
        <Button
          type="button"
          onClick={() => generatePrompts.mutate()}
          disabled={generatePrompts.isPending}
        >
          {generatePrompts.isPending
            ? "Generating prompts…"
            : "Generate prompts"}
        </Button>
      )}

      {generatePrompts.isError && (
        <p className="text-destructive">{generatePrompts.error.message}</p>
      )}

      {prompts.length > 0 && (
        <div className="space-y-2">
          {prompts.map((p) => (
            <Button
              key={p.prompt}
              variant="outline"
              className="h-auto w-full text-left whitespace-normal p-4"
              onClick={() => onSelect(p.prompt, p.target_words)}
            >
              <div>
                <p>{p.prompt}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Words: {p.target_words.join(", ")}
                </p>
              </div>
            </Button>
          ))}
        </div>
      )}
    </>
  );
}

function NewStory() {
  const { topic: initialTopic } = Route.useLoaderData();

  const { data: topics } = useSuspenseQuery(
    orpc.topic.getAllTopics.queryOptions({ input: {} })
  );

  const { state, handleTopicSelected, selectPrompt, finishRecording, reset } =
    useNewStory({
      topicId: initialTopic?.id,
      topicWords: initialTopic?.words,
    });

  return (
    <main className="p-4">
      <div className="space-y-4">
        {state.stage === "topic-selection" && (
          <>
            <h1 className="text-2xl font-bold">New Recording</h1>
            <p>Select a topic to practice:</p>
            {topics.length === 0 ? (
              <p className="text-muted-foreground">
                No topics found. Create a topic first to start recording.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    onClick={() => handleTopicSelected(t.id, t.words)}
                  >
                    {t.name} ({t.words.length} words)
                  </Button>
                ))}
              </div>
            )}
          </>
        )}

        {state.stage === "prompt-selection" && (
          <PromptSelection topicId={state.topicId} onSelect={selectPrompt} />
        )}

        {state.stage === "recording-story" && (
          <>
            <h1 className="text-2xl font-bold">Record your story</h1>
            <p className="text-lg">{state.prompt}</p>
            <p className="text-sm text-muted-foreground">
              Target words: {state.targetWords.join(", ")}
            </p>
            <RecordStory onFinish={finishRecording} />
          </>
        )}

        {state.stage === "uploading" && (
          <h1 className="text-2xl font-bold">Uploading your recording...</h1>
        )}

        {state.stage === "analysing" && (
          <h1 className="text-2xl font-bold">Analysing your story...</h1>
        )}

        {state.stage === "error" && (
          <>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-destructive">{state.message}</p>
            <Button onClick={reset} type="button">
              Try again
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
