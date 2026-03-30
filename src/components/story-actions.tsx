import { MoreVerticalCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { orpc } from "#/orpc/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StoryActionsProps {
  storyId: string;
}

export const StoryActions = ({ storyId }: StoryActionsProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateStoryQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.story.getAllStories.queryOptions({ input: {} }).queryKey,
    });
    await queryClient.invalidateQueries({
      queryKey: orpc.story.getStory.queryOptions({ input: { id: storyId } })
        .queryKey,
    });
    await queryClient.invalidateQueries({
      queryKey: orpc.errorInstance.getErrorInstancesForStory.queryOptions({
        input: { storyId },
      }).queryKey,
    });
  }, [queryClient, storyId]);

  const reanalyseStory = useMutation(
    orpc.story.reanalyseStory.mutationOptions({
      onSuccess: async () => {
        await invalidateStoryQueries();
      },
    })
  );
  const deleteStory = useMutation(
    orpc.story.deleteStory.mutationOptions({
      onSuccess: async () => {
        await invalidateStoryQueries();
        await navigate({ to: "/" });
      },
    })
  );

  const handleReanalyse = useCallback(() => {
    reanalyseStory.mutate({ id: storyId });
  }, [reanalyseStory, storyId]);

  const handleDelete = useCallback(() => {
    deleteStory.mutate({ id: storyId });
  }, [deleteStory, storyId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button">
          <HugeiconsIcon icon={MoreVerticalCircle01Icon} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={reanalyseStory.isPending || deleteStory.isPending}
            onClick={handleReanalyse}
          >
            Re-analyse
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={reanalyseStory.isPending || deleteStory.isPending}
            onClick={handleDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
