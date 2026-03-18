import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface ExportProgressDialogProps {
  open: boolean;
  phase: string;
  current: number;
  total: number;
}

export const ExportProgressDialog = ({ open, phase, current, total }: ExportProgressDialogProps) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Generating PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{phase}</p>
          <Progress value={percent} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {current} / {total} — {percent}%
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
