import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  HandHeart, Flag, Users, CheckCircle2, XCircle, AlertTriangle,
  ShieldOff, ShieldCheck, ExternalLink, Loader2, Search, FileText,
  RefreshCw, MapPin, Building2, Truck, HandHeart as NeedyIcon,
  Gift, ChevronDown, ChevronUp, Calendar, Hash,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

// ── Types ──────────────────────────────────────────────────────────────────

type Report = {
  reportId: string;
  targetType: "post" | "user" | "message";
  targetId: string;
  reason: string;
  details?: string;
  reporterUid: string;
  createdAt: string;
  status: string;
};

type UserRecord = {
  uid: string;
  displayName?: string;
  email?: string;
  role: string;
  suspended?: boolean;
  businessName?: string;
  businessType?: string;
  website?: string;
  bio?: string;
  vehicleType?: string;
  location?: { lat: number; lng: number };
  ratingAvg?: number;
  ratingCount?: number;
  postCount?: number;
  createdAt?: string;
  emailVerified?: boolean;
};

type Post = {
  postId: string;
  kind: "offer" | "need";
  category: string;
  status: string;
  authorId: string;
  authorRole?: string;
  description?: string;
  items: Array<{ name: string; quantity: number }>;
  photoURL?: string;
  createdAt?: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  inappropriate: "Inappropriate",
  offensive: "Offensive",
  fake: "Fake / Fraudulent",
  other: "Other",
};

const ROLE_COLORS: Record<string, string> = {
  helper: "bg-emerald-50 text-emerald-700 border-emerald-200",
  needy: "bg-red-50 text-red-700 border-red-200",
  driver: "bg-blue-50 text-blue-700 border-blue-200",
  organization: "bg-violet-50 text-violet-700 border-violet-200",
  admin: "bg-amber-50 text-amber-700 border-amber-200",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  helper: <Gift size={11} />,
  needy: <NeedyIcon size={11} />,
  driver: <Truck size={11} />,
  organization: <Building2 size={11} />,
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  claimed: "bg-amber-50 text-amber-700 border-amber-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-slate-50 text-slate-500 border-slate-200",
  removed: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-slate-50 text-slate-400 border-slate-200",
  partially_delivered: "bg-violet-50 text-violet-700 border-violet-200",
};

// ── UserDetailDialog ───────────────────────────────────────────────────────

function UserDetailDialog({
  uid,
  open,
  onOpenChange,
  onSuspendChange,
}: {
  uid: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuspendChange: (uid: string, suspended: boolean) => void;
}) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const adminUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid || !open) return;
    setUser(null);
    setLoading(true);
    api<UserRecord>(`/api/v1/admin/users/${uid}`)
      .then(setUser)
      .catch(() => toast.error("Failed to load user details."))
      .finally(() => setLoading(false));
  }, [uid, open]);

  async function handleSuspend(suspend: boolean) {
    if (!user) return;
    setSuspending(true);
    try {
      if (suspend) {
        await api(`/api/v1/admin/users/${user.uid}/suspend`, { method: "POST" });
        toast.success("User suspended.");
      } else {
        await api(`/api/v1/admin/users/${user.uid}/suspend`, { method: "DELETE" });
        toast.success("User reinstated.");
      }
      setUser((u) => u ? { ...u, suspended: suspend } : u);
      onSuspendChange(user.uid, suspend);
    } catch {
      toast.error("Action failed.");
    } finally {
      setSuspending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>Full profile and account info.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {user && !loading && (
          <div className="space-y-4">
            {/* Name + role */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-base">
                  {user.businessName || user.displayName || "—"}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className={`text-xs flex items-center gap-1 ${ROLE_COLORS[user.role] ?? ""}`}>
                  {ROLE_ICONS[user.role]}
                  {user.role}
                </Badge>
                {user.suspended && (
                  <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                    Suspended
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-2 text-sm">
              {user.bio && (
                <div>
                  <span className="text-muted-foreground font-medium">Bio: </span>
                  {user.bio}
                </div>
              )}
              {user.vehicleType && (
                <div>
                  <span className="text-muted-foreground font-medium">Vehicle: </span>
                  {user.vehicleType}
                </div>
              )}
              {user.businessType && (
                <div>
                  <span className="text-muted-foreground font-medium">Org type: </span>
                  {user.businessType}
                </div>
              )}
              {user.website && (
                <div>
                  <span className="text-muted-foreground font-medium">Website: </span>
                  <a href={user.website} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                    {user.website}
                  </a>
                </div>
              )}
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">Location: </span>
                  {user.location.lat.toFixed(4)}, {user.location.lng.toFixed(4)}
                </div>
              )}
              {user.ratingAvg != null && (
                <div>
                  <span className="text-muted-foreground font-medium">Rating: </span>
                  ★ {user.ratingAvg.toFixed(1)} ({user.ratingCount} reviews)
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                {user.postCount != null && (
                  <span className="flex items-center gap-1">
                    <Hash size={11} />
                    {user.postCount} post{user.postCount !== 1 ? "s" : ""}
                  </span>
                )}
                {user.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                )}
                {user.emailVerified != null && (
                  <span>{user.emailVerified ? "✓ Email verified" : "Email unverified"}</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(`/admin/users/${user.uid}`, "_blank")}
              >
                <ExternalLink size={12} />
                View posts
              </Button>
              {user.role !== "admin" && adminUid !== user.uid && (
                <Button
                  variant="outline"
                  size="sm"
                  className={user.suspended
                    ? "gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    : "gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
                  }
                  disabled={suspending}
                  onClick={() => handleSuspend(!user.suspended)}
                >
                  {suspending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : user.suspended ? (
                    <ShieldCheck size={12} />
                  ) : (
                    <ShieldOff size={12} />
                  )}
                  {user.suspended ? "Reinstate" : "Suspend"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── PostsTab ───────────────────────────────────────────────────────────────

function PostsTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async (kind: string, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (kind) params.set("kind", kind);
      if (status) params.set("status", status);
      params.set("limit", "100");
      const res = await api<{ posts: Post[] }>(`/api/v1/admin/posts?${params}`);
      setPosts(res.posts);
    } catch {
      toast.error("Failed to load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(kindFilter, statusFilter);
  }, [kindFilter, statusFilter, fetchPosts]);

  async function handleRemove(postId: string) {
    setActingId(postId);
    try {
      await api(`/api/v1/admin/posts/${postId}`, { method: "DELETE" });
      setPosts((p) => p.map((x) => x.postId === postId ? { ...x, status: "removed" } : x));
      toast.success("Post removed.");
    } catch {
      toast.error("Failed to remove post.");
    } finally {
      setActingId(null);
    }
  }

  async function handleRestore(postId: string) {
    setActingId(postId);
    try {
      await api(`/api/v1/admin/posts/${postId}/restore`, { method: "PUT" });
      setPosts((p) => p.map((x) => x.postId === postId ? { ...x, status: "open" } : x));
      toast.success("Post restored.");
    } catch {
      toast.error("Failed to restore post.");
    } finally {
      setActingId(null);
    }
  }

  const KIND_FILTERS = [
    { value: "", label: "All" },
    { value: "offer", label: "Offers" },
    { value: "need", label: "Needs" },
  ];
  const STATUS_FILTERS = [
    { value: "", label: "All" },
    { value: "open", label: "Open" },
    { value: "claimed", label: "Claimed" },
    { value: "delivered", label: "Delivered" },
    { value: "removed", label: "Removed" },
    { value: "expired", label: "Expired" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setKindFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                kindFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          No posts found.
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const title = post.items.length > 0 ? post.items[0].name : (post.description || "Post").slice(0, 50);
            return (
              <div key={post.postId} className="rounded-xl border border-border p-3 flex items-start gap-3">
                {post.photoURL ? (
                  <img src={post.photoURL} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  {post.items.length > 1 && (
                    <p className="text-xs text-muted-foreground">+{post.items.length - 1} more item{post.items.length > 2 ? "s" : ""}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${post.kind === "offer" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {post.kind}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[post.status] ?? ""}`}>
                      {post.status}
                    </Badge>
                    {post.authorRole && ROLE_ICONS[post.authorRole] && (
                      <Badge variant="outline" className={`text-xs flex items-center gap-1 ${ROLE_COLORS[post.authorRole] ?? ""}`}>
                        {ROLE_ICONS[post.authorRole]}
                        {post.authorRole}
                      </Badge>
                    )}
                    {post.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7 px-2 text-xs"
                    onClick={() => window.open(`/post/${post.postId}`, "_blank")}
                  >
                    <ExternalLink size={11} />
                    View
                  </Button>
                  {post.status !== "removed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 px-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
                      disabled={actingId === post.postId}
                      onClick={() => handleRemove(post.postId)}
                    >
                      {actingId === post.postId ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                      Remove
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      disabled={actingId === post.postId}
                      onClick={() => handleRestore(post.postId)}
                    >
                      {actingId === post.postId ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AdminPanel ─────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { role, loading: roleLoading } = useRole();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!roleLoading && role !== "admin") navigate("/", { replace: true });
  }, [role, roleLoading, navigate]);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await api<{ reports: Report[] }>("/api/v1/admin/reports?status=pending&limit=50");
      setReports(res.reports);
    } catch {
      toast.error("Failed to load reports.");
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const fetchUsers = useCallback(async (q: string) => {
    setLoadingUsers(true);
    try {
      const res = await api<{ users: UserRecord[] }>(`/api/v1/admin/users?search=${encodeURIComponent(q)}&limit=50`);
      setUsers(res.users);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Load reports on mount
  useEffect(() => {
    if (role === "admin") fetchReports();
  }, [role, fetchReports]);

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === "users" && users.length === 0) fetchUsers("");
  }, [activeTab]);

  // Debounced real-time search
  useEffect(() => {
    if (activeTab !== "users") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, activeTab]);

  async function handleResolve(reportId: string, action: "resolve" | "dismiss") {
    setResolvingId(reportId);
    try {
      await api(`/api/v1/admin/reports/${reportId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setReports((prev) => prev.filter((r) => r.reportId !== reportId));
      toast.success(action === "resolve" ? "Report resolved." : "Report dismissed.");
    } catch {
      toast.error("Action failed. Try again.");
    } finally {
      setResolvingId(null);
    }
  }

  async function handleRemovePost(postId: string, reportId: string) {
    try {
      await api(`/api/v1/admin/posts/${postId}`, { method: "DELETE" });
      await handleResolve(reportId, "resolve");
    } catch {
      toast.error("Failed to remove post.");
    }
  }

  function openUserDetail(uid: string) {
    setSelectedUid(uid);
    setUserDetailOpen(true);
  }

  function handleSuspendChange(uid: string, suspended: boolean) {
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, suspended } : u));
  }

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <HandHeart size={22} className="text-primary" />
            <span className="font-semibold">Bridge</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              Admin Panel
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut(auth).then(() => navigate("/"))}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="reports" className="gap-2">
              <Flag size={14} />
              Reports
              {reports.length > 0 && (
                <Badge className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs">
                  {reports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <FileText size={14} />
              Posts
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users size={14} />
              Users
            </TabsTrigger>
          </TabsList>

          {/* ── Reports ─────────────────────────────────────────────── */}
          <TabsContent value="reports" className="space-y-3">
            {loadingReports ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
                No pending reports. All clear.
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.reportId} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">{r.targetType}</Badge>
                      <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5">
                        <AlertTriangle size={10} className="mr-1" />
                        {REASON_LABELS[r.reason] ?? r.reason}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">ID: {r.targetId}</p>
                    {r.details && <p className="text-sm text-foreground">"{r.details}"</p>}
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.targetType === "post" && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(`/post/${r.targetId}`, "_blank")}>
                          <ExternalLink size={12} />View post
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRemovePost(r.targetId, r.reportId)}
                          disabled={resolvingId === r.reportId}
                        >
                          <XCircle size={12} />Remove post
                        </Button>
                      </>
                    )}
                    {r.targetType === "user" && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openUserDetail(r.targetId)}>
                        <ExternalLink size={12} />View user
                      </Button>
                    )}
                    <Button
                      variant="outline" size="sm"
                      className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleResolve(r.reportId, "resolve")}
                      disabled={resolvingId === r.reportId}
                    >
                      <CheckCircle2 size={12} />Resolve
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                      onClick={() => handleResolve(r.reportId, "dismiss")}
                      disabled={resolvingId === r.reportId}
                    >
                      <XCircle size={12} />Dismiss
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* ── Posts ────────────────────────────────────────────────── */}
          <TabsContent value="posts">
            <PostsTab />
          </TabsContent>

          {/* ── Users ────────────────────────────────────────────────── */}
          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or org name…"
                className="pl-9"
              />
              {loadingUsers && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {!loadingUsers && users.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                {search ? "No users match your search." : "No users found."}
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.uid}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 cursor-pointer hover:bg-accent/40 transition-colors"
                    onClick={() => openUserDetail(u.uid)}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {u.businessName || u.displayName || "—"}
                        </p>
                        {u.suspended && (
                          <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                            Suspended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <Badge variant="outline" className={`text-xs w-fit flex items-center gap-1 ${ROLE_COLORS[u.role] ?? ""}`}>
                        {ROLE_ICONS[u.role]}
                        {u.role}
                      </Badge>
                    </div>
                    <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <UserDetailDialog
        uid={selectedUid}
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        onSuspendChange={handleSuspendChange}
      />
    </div>
  );
}
