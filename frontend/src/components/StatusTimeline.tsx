import { cn } from "@/lib/utils";

const STEPS = ["Posted", "Claimed", "Driver found", "In transit", "Delivered"] as const;

const STATUS_INDEX: Record<string, number> = {
  open:           0,
  claimed:        1,
  pending_driver: 1,
  in_transit:     3,
  delivered:      4,
  assigned:       1,
};

interface Props {
  status: string;
}

export default function StatusTimeline({ status }: Props) {
  const current = STATUS_INDEX[status] ?? 0;

  return (
    <div className="flex items-center justify-between">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-center">
            {i > 0 && (
              <div className={cn("h-0.5 flex-1", i <= current ? "bg-primary" : "bg-border")} />
            )}
            <div
              className={cn(
                "h-3 w-3 rounded-full border-2",
                i <= current ? "border-primary bg-primary" : "border-border bg-background"
              )}
            />
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1", i < current ? "bg-primary" : "bg-border")} />
            )}
          </div>
          <span
            className={cn(
              "text-center text-xs",
              i <= current ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
