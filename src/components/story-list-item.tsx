import type { Recording } from "#/db/schema";

export const StoryListItem = ({ story }: { story: Recording }) => (
  <div className="flex items-center justify-between border rounded-md bg-secondary p-4">
    <h1>{story.prompt}</h1>
    <p>{story.transcript?.split(" ").length}</p>
  </div>
);
