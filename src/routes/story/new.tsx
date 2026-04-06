import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

import { NewStoryDialog } from "#/components/new-story-dialog";
import { RecordStory } from "#/components/record-story";
import { Button } from "#/components/ui/button";
import { useNewStory } from "#/hooks/use-new-story";
import { storyPrompts } from "#/lib/consts.ts";
import { orpc } from "#/orpc/client";

const searchSchema = z.object({
  mode: z.enum(["single", "reinforce"]).optional(),
  seriesId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/story/new")({
  component: NewStory,
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    if (!context.userId) {
      throw redirect({ to: "/" });
    }
  },
  loaderDeps: ({ search }) => ({ seriesId: search.seriesId }),
  loader: async ({ context, deps }) => {
    if (!deps.seriesId) {
      return { series: null };
    }
    const series = await context.queryClient.fetchQuery(
      orpc.series.getSeries.queryOptions({ input: { id: deps.seriesId } })
    );
    return { series };
  },
});

const getRandomPrompts = () => {
  const shuffled = [...storyPrompts].toSorted(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

function NewStory() {
  const { mode, seriesId } = Route.useSearch();
  const { series } = Route.useLoaderData();

  const {
    state,
    dialogOpen,
    setDialogOpen,
    handleModeSelected,
    selectPrompt,
    finishRecording,
    reset,
    openDialog,
  } = useNewStory({ mode, seriesId, prompt: series?.title });
  const [prompts] = useState(getRandomPrompts);

  return (
    <main>
      <div>
        {state.stage === "mode-selection" && (
          <>
            <h1>New story</h1>
            <Button type="button" onClick={openDialog}>
              Get started
            </Button>
            <NewStoryDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onSelect={handleModeSelected}
            />
          </>
        )}
        {state.stage === "prompt-selection" && (
          <>
            <h1 className="text-2xl">Start your story</h1>
            <div className="flex gap-4">
              {prompts.map((prompt) => (
                <Button key={prompt} onClick={() => selectPrompt(prompt)}>
                  {prompt}
                </Button>
              ))}
            </div>
          </>
        )}
        {state.stage === "recording-story" && (
          <>
            <h1>Record your story</h1>
            <h2>{state.prompt}</h2>
            <RecordStory onFinish={finishRecording} />
          </>
        )}
        {state.stage === "uploading" && <h1>Uploading your recording...</h1>}
        {state.stage === "analysing" && <h1>Analysing your story...</h1>}
        {state.stage === "error" && (
          <>
            <h1>Something went wrong</h1>
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
