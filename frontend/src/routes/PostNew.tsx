import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import PhotoIntake from "@/components/PhotoIntake";
import ItemChips, { type Item } from "@/components/ItemChips";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";

const ROLE_HOME: Record<string, string> = {
  needy: "/needy", helper: "/helper", driver: "/driver", organization: "/org", admin: "/admin",
};

interface ParsedData {
  category: string;
  items: Item[];
  description: string;
  photoURL: string;
}

export default function PostNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kind = (searchParams.get("kind") ?? "offer") as "offer" | "need";
  const { role, loading: roleLoading } = useEffectiveRole();

  // Drivers can't create posts
  useEffect(() => {
    if (roleLoading) return;
    if (role === "driver") navigate(ROLE_HOME.driver, { replace: true });
  }, [role, roleLoading, navigate]);
  const { coords } = useGeolocation();

  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleParsed(data: ParsedData) {
    setParsed(data);
    setItems(data.items);
    setDescription(data.description);
  }

  async function handleSubmit() {
    if (items.length === 0) {
      toast.error("Add at least one item.");
      return;
    }
    setSubmitting(true);
    try {
      const userRef = doc(db, "users", auth.currentUser!.uid);
      const userDoc = await getDoc(userRef);
      const storedLocation = userDoc.exists() ? userDoc.data().location : null;
      // Prefer live GPS; fall back to what was stored at onboarding
      const location = coords ?? storedLocation ?? { lat: 43.5448, lng: -80.2482 };
      // Keep stored location fresh for future posts
      if (coords && JSON.stringify(coords) !== JSON.stringify(storedLocation)) {
        updateDoc(userRef, { location: coords }).catch(() => {});
      }

      await api("/api/v1/posts", {
        method: "POST",
        body: JSON.stringify({
          kind,
          category: parsed?.category ?? "mixed",
          items,
          description,
          photo_url: parsed?.photoURL ?? "",
          location,
        }),
      });

      toast.success(kind === "offer" ? "Offer posted!" : "Request posted!");
      navigate(ROLE_HOME[role ?? "helper"] ?? "/helper");
    } catch {
      toast.error("Failed to post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className="space-y-6 pb-28">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 pl-0">
            <ArrowLeft size={16} />
            Back
          </Button>
          <h1 className="text-lg font-semibold">
            {kind === "offer" ? "New offer" : "Request help"}
          </h1>
        </div>

        {!parsed ? (
          <PhotoIntake kind={kind} onParsed={handleParsed} />
        ) : (
          <div className="space-y-6">
            {parsed.photoURL && (
              <img
                src={parsed.photoURL}
                alt="Post photo"
                className="max-h-64 w-full rounded-xl object-cover"
              />
            )}

            <div className="space-y-2">
              <h2 className="text-base font-semibold">Items detected</h2>
              <ItemChips items={items} onChange={setItems} kind={kind} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more context…"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {parsed && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pb-6 pt-4">
          <div className="mx-auto max-w-screen-md">
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Posting…" : kind === "offer" ? "Post offer" : "Post request"}
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
