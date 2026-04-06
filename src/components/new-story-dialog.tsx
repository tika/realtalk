import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

type Mode = "single" | "reinforce";

export const NewStoryDialog = ({
  onSelect,
  open,
  onOpenChange,
}: {
  onSelect: (mode: Mode) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const handleSingleClick = () => {
    onSelect("single");
    onOpenChange(false);
  };

  const handleReinforceClick = () => {
    onSelect("reinforce");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New story</DialogTitle>
          <DialogDescription>
            Choose how you'd like to practice.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-1 p-4 text-left whitespace-normal w-full"
            type="button"
            onClick={handleSingleClick}
          >
            <span className="font-semibold">Single Mode</span>
            <span className="text-sm text-muted-foreground">
              Record once and get feedback on your speaking.
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-1 p-4 text-left whitespace-normal w-full"
            type="button"
            onClick={handleReinforceClick}
          >
            <span className="font-semibold">Reinforce Mode</span>
            <span className="text-sm text-muted-foreground">
              Practice the same story multiple times to improve over repeated
              attempts.
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
