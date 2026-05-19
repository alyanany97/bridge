import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, Flag, UserX, MoreVertical } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { api, blockUser } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn, timeAgo } from "@/lib/utils";
import { usePost } from "@/hooks/usePosts";
import PageShell from "@/components/PageShell";
import ReportDialog from "@/components/ReportDialog";

type ItemData = {
  name: string;
  quantity: number;
  size?: string;
  claimedMatchId?: string;
};

const kindColors: Record<string, string> = {
  need: "bg-red-50 text-red-700 border-red-200",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { post, loading } = usePost(id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [selectedClaims, setSelectedClaims] = useState<Record<number, number>>({}); // index -> qty

  const uid = auth.currentUser?.uid;

  // Pre-select all unclaimed items at full quantity when dialog opens
  useEffect(() => {
    if (dialogOpen && post) {
      const initial: Record<number, number> = {};
      (post.items as ItemData[]).forEach((item, i) => {
        if (!item.claimedMatchId && item.quantity > 0) {
          initial[i] = item.quantity;
        }
      });
      setSelectedClaims(initial);
    }
  }, [dialogOpen, post]);

  function toggleItem(i: number, qty: number) {
    setSelectedClaims((prev) => {
      if (i in prev) {
        const next = { ...prev };
        delete next[i];
        return next;
      }
      return { ...prev, [i]: qty };
    });
  }

  function setQty(i: number, qty: number, max: number) {
    const clamped = Math.max(1, Math.min(qty, max));
    setSelectedClaims((prev) => ({ ...prev, [i]: clamped }));
  }

  async function handleClaim() {
    const claimEntries = Object.entries(selectedClaims);
    if (!post || claimEntries.length === 0) return;
    setClaiming(true);
    try {
      const item_claims = claimEntries.map(([idx, qty]) => ({
        index: parseInt(idx),
        quantity: qty,
      }));
      const match = await api<{ matchId: string }>(`/posts/${post.postId}/claim`, {
        method: "POST",
        body: JSON.stringify({ item_claims }),
      });
      setDialogOpen(false);
      navigate(`/match/${match.matchId}`);
    } catch {
      toast.error("Failed to claim. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleBlock() {
    if (!post) return;
    setBlocking(true);
    try {
      await blockUser(post.authorId);
      toast.success("User blocked. You won't see their posts.");
      setBlockDialogOpen(false);
      navigate(-1);
    } catch {
      toast.error("Failed to block user.");
    } finally {
      setBlocking(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "posts", post.postId));
      toast.success("Post deleted.");
      navigate(-1);
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
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

  const isAuthor = uid === post.authorId;
  const ago = post.createdAt ? timeAgo(post.createdAt.seconds) : "";
  const items = post.items as ItemData[];
  const unclaimedItems = items.filter((it) => !it.claimedMatchId);
  const title =
    items.length > 0 ? items[0].name : post.description.slice(0, 60);

  return (
    <PageShell>
      <div className="space-y-4 pb-28">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 pl-0">
            <ArrowLeft size={16} />
            Back
          </Button>
          {!isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag size={14} className="mr-2" />
                  Report post
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setBlockDialogOpen(true)}
                >
                  <UserX size={14} className="mr-2" />
                  Block user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {post.photoURL ? (
          <img
            src={post.photoURL}
            alt={post.description}
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
        ) : (
          <div className="aspect-[4/3] w-full rounded-xl bg-muted" />
        )}

        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold leading-tight">{title}</h1>
          <div className="flex shrink-0 flex-col gap-1">
            <Badge variant="outline" className={cn("text-xs", kindColors[post.kind])}>
              {post.kind === "need" ? "Need" : "Offer"}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {post.category}
            </Badge>
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={12} />
          {ago}
        </p>

        {unclaimedItems.length < items.length && (
          <p className="text-xs text-amber-600 font-medium">
            {unclaimedItems.length} of {items.length} items still available
          </p>
        )}

        <Separator />

        <div className="space-y-2">
          <h2 className="text-base font-semibold">Items</h2>
          <ul className="space-y-1.5">
            {items.map((it, i) => {
              const taken = !!it.claimedMatchId;
              return (
                <li key={i} className={cn("flex items-center justify-between text-sm", taken ? "text-muted-foreground" : "text-foreground")}>
                  <span className={cn(taken && "line-through")}>
                    • {it.name}
                    {it.quantity > 1 ? ` ×${it.quantity}` : ""}
                    {it.size ? ` (${it.size})` : ""}
                  </span>
                  {taken && (
                    <span className="ml-2 flex items-center gap-1 text-xs text-amber-600">
                      <CheckCircle2 size={11} />
                      Taken
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {post.description && (
          <>
            <Separator />
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Description</h2>
              <p className="text-sm leading-relaxed text-foreground">{post.description}</p>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pb-6 pt-4">
        <div className="mx-auto max-w-screen-md">
          {isAuthor ? (
            post.status === "open" ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate(`/post/${post.postId}/edit`)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              </div>
            ) : (
              <Button className="w-full" disabled>
                {post.status === "claimed" ? "All items claimed" : "Delivered"}
              </Button>
            )
          ) : unclaimedItems.length === 0 ? (
            <Button className="w-full" disabled>All items taken</Button>
          ) : (
            <Button className="w-full" onClick={() => setDialogOpen(true)}>
              {post.kind === "offer" ? "Select items to receive" : "Select items you can help with"}
            </Button>
          )}
        </div>
      </div>

      {/* Partial claim dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {post.kind === "offer" ? "What would you like?" : "What can you help with?"}
            </DialogTitle>
            <DialogDescription>
              Select the items you want — a driver will be assigned for your selection.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-y-auto py-1">
            {items.map((it, i) => {
              const taken = !!it.claimedMatchId || it.quantity === 0;
              const checked = i in selectedClaims;
              const claimedQty = selectedClaims[i] ?? it.quantity;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                    taken ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-accent",
                    checked && !taken && "border-primary bg-primary/5"
                  )}
                  onClick={() => !taken && toggleItem(i, it.quantity)}
                >
                  <input
                    type="checkbox"
                    checked={checked && !taken}
                    disabled={taken}
                    onChange={() => !taken && toggleItem(i, it.quantity)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.quantity} available{it.size ? ` · ${it.size}` : ""}
                      {taken ? " · Already taken" : ""}
                    </p>
                  </div>
                  {checked && !taken && it.quantity > 1 && (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded border text-sm font-bold hover:bg-accent"
                        onClick={() => setQty(i, claimedQty - 1, it.quantity)}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{claimedQty}</span>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded border text-sm font-bold hover:bg-accent"
                        onClick={() => setQty(i, claimedQty + 1, it.quantity)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleClaim} disabled={claiming || Object.keys(selectedClaims).length === 0}>
              {claiming
                ? "Arranging…"
                : `Arrange delivery (${Object.values(selectedClaims).reduce((a, b) => a + b, 0)} unit${Object.values(selectedClaims).reduce((a, b) => a + b, 0) !== 1 ? "s" : ""})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>This will permanently remove your post. It can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Keep it</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block user dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block this user?</DialogTitle>
            <DialogDescription>
              Their posts won't appear in your feed. They won't be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={blocking}>
              {blocking ? "Blocking…" : "Block user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      {post && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="post"
          targetId={post.postId}
          targetLabel="this post"
        />
      )}
    </PageShell>
  );
}
