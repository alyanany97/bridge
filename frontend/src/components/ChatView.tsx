import { useEffect, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Send } from "lucide-react";
import { auth, db } from "@/firebase";
import { useMessages, type ChatChannel } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

interface Props {
  matchId: string;
  channel: ChatChannel;
}

export default function ChatView({ matchId, channel }: Props) {
  const messages = useMessages(matchId, channel);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending || !uid) return;
    setSending(true);
    setText("");
    try {
      await addDoc(collection(db, "matches", matchId, channel), {
        text: trimmed,
        senderId: uid,
        senderName: auth.currentUser?.displayName ?? "User",
        createdAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-3">
        {messages.length === 0 && (
          <p className="m-auto text-xs text-muted-foreground">No messages yet. Say hi!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === uid;
          return (
            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
              {!isMe && (
                <span className="mb-0.5 text-xs text-muted-foreground">{msg.senderName}</span>
              )}
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3 py-1.5 text-sm leading-snug",
                  isMe
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-background shadow-sm"
                )}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
