import { useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, ArrowLeft, CheckCircle2, Truck } from "lucide-react";
import { DocumentData } from "firebase/firestore";
import { auth } from "@/firebase";
import { useActiveMatches } from "@/hooks/useActiveMatches";
import ChatView from "./ChatView";
import { type ChatChannel } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

// ─── Tab config per role ──────────────────────────────────────────────────────

interface TabDef {
  label: string;
  channel: ChatChannel;
}

function getChatTabs(match: DocumentData, uid: string): TabDef[] {
  const hasDriver = !!match.driverId;

  if (match.needyId === uid) {
    const tabs: TabDef[] = [
      { label: "Group",  channel: "chat_group" },
      { label: "Helper", channel: "chat_helper_needy" },
    ];
    if (hasDriver) tabs.push({ label: "Driver", channel: "chat_needy_driver" });
    return tabs;
  }
  if (match.helperId === uid) {
    const tabs: TabDef[] = [
      { label: "Group",        channel: "chat_group" },
      { label: "Needy person", channel: "chat_helper_needy" },
    ];
    if (hasDriver) tabs.push({ label: "Driver", channel: "chat_helper_driver" });
    return tabs;
  }
  if (match.driverId === uid) {
    return [
      { label: "Group",        channel: "chat_group" },
      { label: "Needy person", channel: "chat_needy_driver" },
      { label: "Helper",       channel: "chat_helper_driver" },
    ];
  }
  return [{ label: "Group", channel: "chat_group" }];
}

// ─── Match summary card ───────────────────────────────────────────────────────

function MatchListCard({
  match,
  onClick,
}: {
  match: DocumentData;
  onClick: () => void;
}) {
  const items = match.items as Array<{ name: string; quantity: number }> | undefined;
  const title =
    items && items.length > 0
      ? items[0].name + (items.length > 1 ? ` +${items.length - 1} more` : "")
      : "Delivery";
  const isDelivered = match.status === "delivered";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent",
        isDelivered && "opacity-60"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isDelivered ? "bg-slate-100" : "bg-primary/10"
        )}
      >
        {isDelivered ? (
          <CheckCircle2 size={18} className="text-slate-500" />
        ) : (
          <Truck size={18} className="text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className={cn("text-xs", isDelivered ? "text-slate-500" : "text-muted-foreground")}>
          {isDelivered ? "Delivered — chat closed" : "Tap to open chat"}
        </p>
      </div>
    </button>
  );
}

// ─── Chat panel for a single match ───────────────────────────────────────────

function MatchChatPanel({
  match,
  onBack,
}: {
  match: DocumentData;
  onBack: () => void;
}) {
  const uid = auth.currentUser?.uid ?? "";
  const tabs = getChatTabs(match, uid);
  const [activeTab, setActiveTab] = useState(0);
  const isDelivered = match.status === "delivered";

  const items = match.items as Array<{ name: string; quantity: number }> | undefined;
  const title =
    items && items.length > 0
      ? items[0].name + (items.length > 1 ? ` +${items.length - 1}` : "")
      : "Delivery";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent"
          aria-label="Back to chats"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {match.status?.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {isDelivered ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <CheckCircle2 size={36} className="text-primary" />
          <p className="text-sm font-medium">Delivery complete</p>
          <p className="text-xs text-muted-foreground">
            Chat is closed after delivery. Thanks for using Bridge!
          </p>
        </div>
      ) : (
        <>
          {tabs.length > 1 && (
            <div className="flex border-b border-border">
              {tabs.map((tab, i) => (
                <button
                  key={tab.channel}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium transition-colors",
                    i === activeTab
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
            <ChatView
              key={tabs[activeTab].channel}
              matchId={match.matchId}
              channel={tabs[activeTab].channel}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main drawer ─────────────────────────────────────────────────────────────

export default function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const matches = useActiveMatches();

  const activeCount = matches.filter((m) => m.status !== "delivered").length;
  const selectedMatch = matches.find((m) => m.matchId === selectedMatchId) ?? null;

  function close() {
    setOpen(false);
    setSelectedMatchId(null);
  }

  const portal = createPortal(
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-[101] flex h-full w-[88vw] max-w-sm flex-col bg-background shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-base font-semibold">Messages</h2>
          <button
            onClick={close}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedMatch ? (
            <MatchChatPanel
              match={selectedMatch}
              onBack={() => setSelectedMatchId(null)}
            />
          ) : (
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
              {matches.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
                  <MessageCircle size={36} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No active deliveries yet.
                    <br />
                    Chats appear once a match is made.
                  </p>
                </div>
              ) : (
                <>
                  {matches.filter((m) => m.status !== "delivered").length > 0 && (
                    <>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Active
                      </p>
                      {matches
                        .filter((m) => m.status !== "delivered")
                        .map((m) => (
                          <MatchListCard
                            key={m.matchId}
                            match={m}
                            onClick={() => setSelectedMatchId(m.matchId)}
                          />
                        ))}
                    </>
                  )}
                  {matches.filter((m) => m.status === "delivered").length > 0 && (
                    <>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Completed
                      </p>
                      {matches
                        .filter((m) => m.status === "delivered")
                        .map((m) => (
                          <MatchListCard
                            key={m.matchId}
                            match={m}
                            onClick={() => setSelectedMatchId(m.matchId)}
                          />
                        ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Open chats"
      >
        <MessageCircle size={20} />
        {activeCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>

      {portal}
    </>
  );
}
