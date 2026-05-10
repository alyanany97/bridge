import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";

export type ChatChannel =
  | "chat_group"
  | "chat_helper_needy"
  | "chat_helper_driver"
  | "chat_needy_driver";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: { seconds: number } | null;
}

export function useMessages(matchId: string | undefined, channel: ChatChannel) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!matchId) return;
    setMessages([]);
    const q = query(
      collection(db, "matches", matchId, channel),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [matchId, channel]);

  return messages;
}
