import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, PackageSearch, MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageShell from "@/components/PageShell";
import { usePendingMatches, useMyDriverMatches } from "@/hooks/usePosts";
import { timeAgo } from "@/lib/utils";
import { DocumentData } from "firebase/firestore";

type Tab = "available" | "active";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_transit: { label: "In transit", color: "bg-blue-50 text-blue-700 border-blue-200" },
  delivered:  { label: "Delivered",  color: "bg-slate-50 text-slate-600 border-slate-200" },
};

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
      a.city || a.town || a.village || a.county,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : data.display_name?.split(",").slice(0, 2).join(",") ?? "";
  } catch {
    return "";
  }
}

function LocationRow({
  label,
  location,
  icon,
}: {
  label: string;
  location: { lat: number; lng: number } | undefined;
  icon: React.ReactNode;
}) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    reverseGeocode(location.lat, location.lng).then(setAddress);
  }, [location?.lat, location?.lng]);

  if (!location) return null;

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <span className="font-medium text-muted-foreground">{label}: </span>
        <span className="text-foreground">
          {address === null ? "Loading…" : address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
        </span>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  action,
  onAccept,
}: {
  match: DocumentData;
  action?: React.ReactNode;
  onAccept?: (matchId: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const ago = match.createdAt ? timeAgo(match.createdAt.seconds) : "";
  const items = match.items as Array<{ name: string; quantity: number }> | undefined;
  const status = STATUS_LABELS[match.status];

  async function handleAccept(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onAccept) return;
    setAccepting(true);
    await onAccept(match.matchId);
    setAccepting(false);
  }

  return (
    <div
      className="cursor-pointer rounded-xl border border-border bg-card p-4 space-y-3 hover:bg-accent/40 transition-colors"
      onClick={() => navigate(`/match/${match.matchId}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold leading-tight">
            {items && items.length > 0
              ? items.map((it) => `${it.name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`).join(", ")
              : "Delivery"}
          </p>
          <p className="text-xs text-muted-foreground">{ago}</p>
        </div>
        {status && (
          <Badge variant="outline" className={`shrink-0 text-xs ${status.color}`}>
            {status.label}
          </Badge>
        )}
      </div>

      {items && items.length > 0 && (
        <ul className="space-y-0.5">
          {items.slice(0, 3).map((it, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              • {it.name}{it.quantity > 1 ? ` ×${it.quantity}` : ""}
            </li>
          ))}
          {items.length > 3 && (
            <li className="text-xs text-muted-foreground">+{items.length - 3} more</li>
          )}
        </ul>
      )}

      <div className="space-y-1.5 border-t border-border pt-2">
        <LocationRow
          label="Pick up"
          location={match.pickupLocation}
          icon={<MapPin size={12} />}
        />
        <LocationRow
          label="Drop off"
          location={match.dropoffLocation}
          icon={<Navigation size={12} />}
        />
      </div>

      {onAccept && (
        <Button
          size="sm"
          className="w-full"
          onClick={handleAccept}
          disabled={accepting}
        >
          {accepting
            ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Accepting…</>
            : <><Truck size={14} className="mr-1.5" />Accept this delivery</>}
        </Button>
      )}
      {action && !onAccept && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
    </div>
  );
}

export default function DriverHome() {
  const [tab, setTab] = useState<Tab>("available");
  const { matches: pending, loading: pendingLoading } = usePendingMatches();
  const { matches: mine, loading: mineLoading } = useMyDriverMatches();
  const navigate = useNavigate();

  async function acceptDelivery(matchId: string) {
    try {
      await api(`/api/v1/matches/${matchId}/accept`, { method: "POST" });
      toast.success("Delivery accepted! Head to pick up.");
      navigate(`/match/${matchId}`);
    } catch {
      toast.error("Couldn't accept. Try again.");
    }
  }

  const activeDeliveries = mine.filter((m) => m.status === "in_transit");
  const completedDeliveries = mine.filter((m) => m.status === "delivered");

  return (
    <PageShell>
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("available")}
            className={`flex items-center gap-1.5 px-1 pb-2 text-sm font-medium transition-colors ${
              tab === "available"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Available
            {pending.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {pending.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setTab("active")}
            className={`flex items-center gap-1.5 px-1 pb-2 text-sm font-medium transition-colors ${
              tab === "active"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My deliveries
            {activeDeliveries.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {activeDeliveries.length}
              </Badge>
            )}
          </button>
        </div>

        {tab === "available" && (
          <>
            <h2 className="text-lg font-semibold">Available deliveries</h2>
            {pendingLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
              </div>
            )}
            {!pendingLoading && pending.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <PackageSearch size={48} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No deliveries waiting right now.</p>
              </div>
            )}
            <div className="space-y-3">
              {pending.map((match) => (
                <MatchCard
                  key={match.matchId}
                  match={match}
                  onAccept={acceptDelivery}
                />
              ))}
            </div>
          </>
        )}

        {tab === "active" && (
          <>
            <h2 className="text-lg font-semibold">My deliveries</h2>
            {mineLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
              </div>
            )}
            {!mineLoading && mine.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Truck size={48} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You haven't accepted any deliveries yet.
                </p>
              </div>
            )}
            {activeDeliveries.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active</p>
                <div className="space-y-3">
                  {activeDeliveries.map((match) => (
                    <MatchCard key={match.matchId} match={match} />
                  ))}
                </div>
              </>
            )}
            {completedDeliveries.length > 0 && (
              <>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Completed</p>
                <div className="space-y-3">
                  {completedDeliveries.map((match) => (
                    <MatchCard key={match.matchId} match={match} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
