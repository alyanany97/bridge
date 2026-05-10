import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import ItemChips, { type Item } from "@/components/ItemChips";
import { usePost } from "@/hooks/usePosts";

export default function PostEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { post, loading } = usePost(id);

  const [items, setItems] = useState<Item[]>([]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (post && !initialized) {
      setItems(post.items as unknown as Item[]);
      setDescription(post.description ?? "");
      setInitialized(true);
    }
  }, [post, initialized]);

  const uid = auth.currentUser?.uid;

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!post) {
    return (
      <PageShell>
        <div className="py-16 text-center text-sm text-muted-foreground">Post not found.</div>
      </PageShell>
    );
  }

  // Guard: only author can edit, only open posts
  if (post.authorId !== uid || post.status !== "open") {
    navigate(`/post/${id}`, { replace: true });
    return null;
  }

  async function handleSave() {
    if (items.length === 0) {
      toast.error("Add at least one item.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "posts", post!.postId), { items, description });
      toast.success("Post updated.");
      navigate(-1); // pop edit page — goes back to PostDetail, not a new push
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <div className="space-y-6 pb-28">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1 pl-0"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <h1 className="text-lg font-semibold">
            Edit {post.kind === "offer" ? "offer" : "request"}
          </h1>
        </div>

        {post.photoURL && (
          <img
            src={post.photoURL}
            alt="Post photo"
            className="max-h-48 w-full rounded-xl object-cover"
          />
        )}

        <div className="space-y-2">
          <h2 className="text-base font-semibold">Items</h2>
          <ItemChips items={items} onChange={setItems} kind={post.kind} />
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

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pb-6 pt-4">
        <div className="mx-auto max-w-screen-md">
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
