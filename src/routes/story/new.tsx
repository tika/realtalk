import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/story/new")({
  component: NewStory,
});

function NewStory() {
  return <div>Hello /story/new!</div>;
}
