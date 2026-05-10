import { useEffect, useState } from "react";
import { collection, DocumentData, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase";

/**
 * Returns all matches where the current user is helper, needy, or driver.
 * Merges three separate Firestore queries (Firestore doesn't support OR across fields).
 */
export function useActiveMatches() {
  const [matches, setMatches] = useState<DocumentData[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Three buckets keyed by matchId, one per role query
    const buckets: Record<"helper" | "needy" | "driver", Map<string, DocumentData>> = {
      helper: new Map(),
      needy:  new Map(),
      driver: new Map(),
    };

    function rebuild() {
      const merged = new Map<string, DocumentData>();
      Object.values(buckets).forEach((bucket) =>
        bucket.forEach((v, k) => merged.set(k, v))
      );
      setMatches(
        Array.from(merged.values()).sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        )
      );
    }

    const unsubs = (
      [
        ["helper", "helperId"],
        ["needy",  "needyId"],
        ["driver", "driverId"],
      ] as const
    ).map(([bucket, field]) =>
      onSnapshot(
        query(collection(db, "matches"), where(field, "==", uid)),
        (snap) => {
          const m = new Map<string, DocumentData>();
          snap.docs.forEach((d) => m.set(d.id, d.data()));
          buckets[bucket] = m;
          rebuild();
        },
        () => {} // ignore permission errors for roles user isn't in
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  return matches;
}
