import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, X, MoreVertical, Flag } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Post } from "@/hooks/usePosts";
import { cn, distanceKm, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import ReportDialog from "@/components/ReportDialog";

interface Props {
  post: Post;
  userLocation: { lat: number; lng: number } | null;
  showStatus?: boolean;
  allowDelete?: boolean;
}

const categoryColors: Record<string, string> = {
  food: "bg-emerald-50 text-emerald-700 border-emerald-200",
  clothing: "bg-emerald-50 text-emerald-700 border-emerald-200",
  mixed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const kindColors: Record<string, string> = {
  need: "bg-red-50 text-red-700 border-red-200",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  claimed: "bg-amber-50 text-amber-700 border-amber-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-slate-50 text-slate-500 border-slate-200",
  partially_delivered: "bg-violet-50 text-violet-700 border-violet-200",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  claimed: "Claimed",
  in_transit: "In transit",
  delivered: "Delivered",
  partially_delivered: "Partially delivered",
};

export default function PostCard({ post, userLocation, showStatus, allowDelete }: Props) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const uid = auth.currentUser?.uid;
  const isOwn = uid === post.authorId;

  const dist =
    userLocation && post.location
      ? distanceKm(userLocation, post.location).toFixed(1)
      : null;
  const ago = post.createdAt ? timeAgo(post.createdAt.seconds) : "";
  const title =
    post.items.length > 0
      ? (post.items[0] as { name: string }).name
      : post.description.slice(0, 40);

  const canDelete = allowDelete && post.status === "open";

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!canDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "posts", post.postId));
      toast.success("Post deleted.");
    } catch {
      toast.error("Failed to delete post.");
      setDeleting(false);
    }
  }

  return (
    <Card
      className="relative cursor-pointer transition-colors hover:bg-accent"
      onClick={() => navigate(`/post/${post.postId}`)}
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete post"
          >
            <X size={14} />
          </button>
        )}
        {!isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent"
                aria-label="More options"
              >
                <MoreVertical size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setReportOpen(true)}
              >
                <Flag size={14} className="mr-2" />
                Report post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="post"
        targetId={post.postId}
        targetLabel="this post"
      />

      <CardContent className="flex gap-3 p-4">
        {post.photoURL ? (
          <img
            src={post.photoURL}
            alt={post.description}
            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1 pr-4">
          <p className="truncate text-base font-semibold">{title}</p>
          {post.items.length > 1 && (
            <p className="text-xs text-muted-foreground">
              +{post.items.length - 1} more item{post.items.length > 2 ? "s" : ""}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {dist && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {dist} km
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock size={10} />
              {ago}
            </span>
          </div>
          <div className="flex gap-1 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", kindColors[post.kind])}>
              {post.kind === "need" ? "Need" : "Offer"}
            </Badge>
            <Badge variant="outline" className={cn("text-xs capitalize", categoryColors[post.category])}>
              {post.category}
            </Badge>
            {showStatus && (
              <Badge variant="outline" className={cn("text-xs", statusColors[post.status])}>
                {statusLabels[post.status] ?? post.status}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
