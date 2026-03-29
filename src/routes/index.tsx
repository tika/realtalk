import { createFileRoute } from "@tanstack/react-router";

import { StoryListItem } from "#/components/story-list-item.tsx";

// import { StoryListItem } from "#/components/story-list-item";

const App = () => (
  // get all the stories and map them to be rendered
  <main>
    <div className="">
      <h1 className="font-bold">Realtalk</h1>
      <div className="flex flex-col gap-2">
        <StoryListItem
          story={{
            id: "1",
            prompt: "Story prompt",
            transcript: "This is my transcript",
            createdAt: new Date(),
            updatedAt: new Date(),
            audioUrl: "",
            deletedAt: null,
            timestamps: {},
          }}
        />
        <StoryListItem
          story={{
            id: "1",
            prompt: "Story prompt 2",
            transcript: "This is my transcript 5",
            createdAt: new Date(),
            updatedAt: new Date(),
            audioUrl: "",
            deletedAt: null,
            timestamps: {},
          }}
        />
      </div>
      {/*{stories.map((story) => (
        <StoryListItem story={story} key={story.id} />
      ))}*/}
    </div>
  </main>
);

export const Route = createFileRoute("/")({ component: App });
