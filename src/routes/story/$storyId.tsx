import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/story/$storyId")({
  component: StoryDetail,
});

function StoryDetail() {
  const { storyId } = Route.useParams();

  return <div>Hello {storyId}!</div>;
}
