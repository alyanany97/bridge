import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Truck, CheckCircle2, ArrowLeft, Clock, PackageSearch, AlertTriangle } from "lucide-react";
import { api } from "@/api";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMatch } from "@/hooks/usePosts";
import StatusTimeline from "@/components/StatusTimeline";
import PageShell from "@/components/PageShell";

export default function MatchStatus() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  const { match, loading } = useMatch(id);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!match || !match.etaSetAt || match.status === "delivered") return;
    const etaSetAt: number = match.etaSetAt?.seconds ?? Date.now() / 1000;
    const totalSeconds = match.etaMinutes * 60;

    const tick = () => {
      const elapsed = Date.now() / 1000 - etaSetAt;
      const remaining = Math.max(0, totalSeconds - elapsed);
      setSecondsLeft(Math.round(remaining));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match]);

  async function handleDeliver() {
    setActing(true);
    try {
      await api(`/matches/${id}/deliver`, { method: "POST" });
      toast.success("Marked as delivered!");
    } catch {
      toast.error("Failed to update delivery status.");
    } finally {
      setActing(false);
    }
  }

  if (loading || !match) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-6 w-full" />
        </div>
      </PageShell>
    );
  }

  const isDelivered = match.status === "delivered";
  const isPendingDriver = match.status === "pending_driver";
  const isInTransit = match.status === "in_transit";
  const isDriver = match.driverId === uid;

  const totalSeconds = match.etaMinutes * 60;
  const progressPct =
    secondsLeft != null ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const etaMins = secondsLeft != null ? Math.floor(secondsLeft / 60) : 0;
  const etaSecs = secondsLeft != null ? secondsLeft % 60 : 0;
  const etaDisplay = `${String(etaMins).padStart(2, "0")}:${String(etaSecs).padStart(2, "0")}`;

  return (
    <PageShell>
      <div className="space-y-6 pb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 pl-0">
          <ArrowLeft size={16} />
          Back
        </Button>

        {isDelivered ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 size={48} className="text-primary" />
            <h1 className="text-xl font-semibold">Delivered!</h1>
            {match.deliveredAt && (
              <p className="text-sm text-muted-foreground">
                Completed at{" "}
                {new Date(match.deliveredAt.seconds * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        ) : isPendingDriver ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <PackageSearch size={36} className="text-amber-500" />
            <h1 className="text-xl font-semibold">Looking for a driver…</h1>
            <p className="text-sm text-muted-foreground">
              A driver will accept and pick up the items shortly.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <Truck size={32} className="text-primary" />
            <h1 className="text-xl font-semibold">
              {match.driver?.name ?? "Driver"} is on the way
            </h1>
            {secondsLeft != null && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="font-mono text-3xl tabular-nums">{etaDisplay}</span>
                </div>
                <Progress
                  value={progressPct}
                  className="h-2 transition-all duration-1000 ease-linear"
                />
                <p className="text-xs text-muted-foreground">estimated time remaining</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {match.items?.length > 0 && (
          <>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold">Items</h2>
              <ul className="space-y-1">
                {(match.items as Array<{ name: string; quantity: number; size?: string }>).map(
                  (it, i) => (
                    <li key={i} className="text-sm">
                      • {it.name}
                      {it.quantity > 1 ? ` ×${it.quantity}` : ""}
                      {it.size ? ` (${it.size})` : ""}
                    </li>
                  )
                )}
              </ul>
            </div>
            <Separator />
          </>
        )}

        <StatusTimeline status={match.status} />

        {isInTransit && isDriver && (
          <>
            <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={acting}>
              {acting ? "Updating…" : "Mark as delivered"}
            </Button>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    Confirm delivery
                  </DialogTitle>
                  <DialogDescription>
                    Marking as delivered will permanently delete all chat messages for this
                    delivery. Make sure you have everything you need before continuing.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmOpen(false);
                      handleDeliver();
                    }}
                  >
                    Yes, mark delivered
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {!isPendingDriver && (
          <p className="text-center text-xs text-muted-foreground">
            💬 Use the chat icon in the header to message your helper, needy person, or driver.
          </p>
        )}
      </div>
    </PageShell>
  );
}
