import { MoreVerticalCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

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

export const getReanalyseStoryMutationKey = (storyId: string) =>
  ["recording", "reanalyse", storyId] as const;

export const StoryActions = ({ storyId }: StoryActionsProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateRecordingQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.recording.getAllRecordings.queryOptions({ input: {} })
        .queryKey,
    });
    await queryClient.invalidateQueries({
      queryKey: orpc.recording.getRecording.queryOptions({
        input: { id: storyId },
      }).queryKey,
    });
    await queryClient.invalidateQueries({
      queryKey: orpc.errorInstance.getErrorInstancesForRecording.queryOptions({
        input: { recordingId: storyId },
      }).queryKey,
    });
  };

  const reanalyseRecording = useMutation(
    orpc.recording.reanalyseRecording.mutationOptions({
      mutationKey: getReanalyseStoryMutationKey(storyId),
      onSuccess: async () => {
        await invalidateRecordingQueries();
      },
    })
  );
  const deleteRecording = useMutation(
    orpc.recording.deleteRecording.mutationOptions({
      onSuccess: async () => {
        await invalidateRecordingQueries();
        await navigate({ to: "/" });
      },
    })
  );

  const handleReanalyse = () => {
    reanalyseRecording.mutate({ id: storyId });
  };

  const handleDelete = () => {
    deleteRecording.mutate({ id: storyId });
  };

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
            disabled={reanalyseRecording.isPending || deleteRecording.isPending}
            onClick={handleReanalyse}
          >
            {reanalyseRecording.isPending ? "Re-analysing..." : "Re-analyse"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={reanalyseRecording.isPending || deleteRecording.isPending}
            onClick={handleDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
