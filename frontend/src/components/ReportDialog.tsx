import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submitReport, type ReportReason, type ReportTargetType } from "@/api";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam or misleading" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "offensive", label: "Offensive or hateful" },
  { value: "fake", label: "Fake or fraudulent" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
}

export default function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
}: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await submitReport(targetType, targetId, reason, details.trim() || undefined);
      toast.success("Report submitted. Thank you for keeping Bridge safe.");
      onOpenChange(false);
      setReason(null);
      setDetails("");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setReason(null);
      setDetails("");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag size={16} className="text-destructive" />
            Report {targetLabel ?? targetType}
          </DialogTitle>
          <DialogDescription>
            Help us keep Bridge safe. Reports are reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Reason</p>
          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  reason === r.value
                    ? "border-primary bg-primary/5 font-medium"
                    : "hover:bg-accent"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {reason === "other" && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Additional details</p>
            <Textarea
              placeholder="Describe the issue…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || submitting}
          >
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
