import {
  MoreVerticalCircle01Icon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
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
  seriesId?: string | null;
}

export const getReanalyseStoryMutationKey = (storyId: string) =>
  ["recording", "reanalyse", storyId] as const;

export const StoryActions = ({ storyId, seriesId }: StoryActionsProps) => {
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
  const convertToSeries = useMutation(
    orpc.series.convertToSeries.mutationOptions({
      onSuccess: async (series) => {
        await navigate({ to: "/story/new", search: { seriesId: series.id } });
      },
    })
  );

  const handleReanalyse = () => {
    reanalyseRecording.mutate({ id: storyId });
  };

  const handleDelete = () => {
    deleteRecording.mutate({ id: storyId });
  };

  const handleReinforce = () => {
    convertToSeries.mutate({ recordingId: storyId });
  };

  const isBusy =
    reanalyseRecording.isPending ||
    deleteRecording.isPending ||
    convertToSeries.isPending;

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
          {!seriesId && (
            <DropdownMenuItem disabled={isBusy} onClick={handleReinforce}>
              <HugeiconsIcon icon={RepeatIcon} className="mr-2 h-4 w-4" />
              {convertToSeries.isPending ? "Starting..." : "Reinforce"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={isBusy} onClick={handleReanalyse}>
            {reanalyseRecording.isPending ? "Re-analysing..." : "Re-analyse"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isBusy} onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
