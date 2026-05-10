import { useEffect, useState } from "react";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/firebase";
import { auth } from "@/firebase";

export interface Post {
  postId: string;
  authorId: string;
  kind: "offer" | "need";
  category: "food" | "clothing" | "mixed";
  items: Array<Record<string, unknown>>;
  description: string;
  photoURL: string;
  location: { lat: number; lng: number };
  status: "open" | "claimed" | "in_transit" | "delivered" | "partially_delivered";
  matchedPostId: string | null;
  createdAt: { seconds: number } | null;
}

export function usePosts(kind: "offer" | "need") {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("kind", "==", kind),
      where("status", "in", ["open", "partially_delivered"]),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((d) => d.data() as Post));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [kind]);

  return { posts, loading, error };
}

export function useMyPosts(kind: "offer" | "need") {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    // No orderBy here — sort client-side to avoid needing a composite index
    const q = query(
      collection(db, "posts"),
      where("kind", "==", kind),
      where("authorId", "==", uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const sorted = snap.docs
          .map((d) => d.data() as Post)
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setPosts(sorted);
        setLoading(false);
      },
      () => setLoading(false) // on error, stop spinning
    );
    return unsub;
  }, [kind]);

  return { posts, loading };
}

export function usePost(postId: string | undefined) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    const ref = doc(db, "posts", postId);
    const unsub = onSnapshot(ref, (snap) => {
      setPost(snap.exists() ? (snap.data() as Post) : null);
      setLoading(false);
    });
    return unsub;
  }, [postId]);

  return { post, loading };
}

export function useMatch(matchId: string | undefined) {
  const [match, setMatch] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    const ref = doc(db, "matches", matchId);
    const unsub = onSnapshot(ref, (snap) => {
      setMatch(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [matchId]);

  return { match, loading };
}

export function usePendingMatches() {
  const [matches, setMatches] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No orderBy — avoids needing a composite index; sort client-side instead
    const q = query(
      collection(db, "matches"),
      where("status", "==", "pending_driver")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const sorted = snap.docs
          .map((d) => d.data())
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setMatches(sorted);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  return { matches, loading };
}

export function useMyDriverMatches() {
  const [matches, setMatches] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    const q = query(collection(db, "matches"), where("driverId", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const sorted = snap.docs
          .map((d) => d.data())
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setMatches(sorted);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  return { matches, loading };
}
