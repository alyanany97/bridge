import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { HandHeart, Flag, Users, CheckCircle2, XCircle, AlertTriangle, ShieldOff, ShieldCheck, ExternalLink, Loader2, Search } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

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
  createdAt?: string;
};

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

export default function AdminPanel() {
  const { role, loading: roleLoading } = useRole();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!roleLoading && role !== "admin") {
      navigate("/", { replace: true });
    }
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

  const fetchUsers = useCallback(async (q = "") => {
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

  useEffect(() => { if (role === "admin") fetchReports(); }, [role, fetchReports]);

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

  async function handleSuspend(uid: string, suspend: boolean) {
    setSuspendingId(uid);
    try {
      if (suspend) {
        await api(`/api/v1/admin/users/${uid}/suspend`, { method: "POST" });
        toast.success("User suspended.");
      } else {
        await api(`/api/v1/admin/users/${uid}/suspend`, { method: "DELETE" });
        toast.success("User reinstated.");
      }
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, suspended: suspend } : u))
      );
    } catch {
      toast.error("Action failed. Try again.");
    } finally {
      setSuspendingId(null);
    }
  }

  async function handleRemovePost(postId: string, reportId: string) {
    try {
      await api(`/api/v1/admin/posts/${postId}`, { method: "DELETE" });
      await handleResolve(reportId, "resolve");
      toast.success("Post removed.");
    } catch {
      toast.error("Failed to remove post.");
    }
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
      {/* Header */}
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
        <Tabs defaultValue="reports">
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
            <TabsTrigger value="users" className="gap-2" onClick={() => fetchUsers(search)}>
              <Users size={14} />
              Users
            </TabsTrigger>
          </TabsList>

          {/* ── Reports tab ─────────────────────────────────────── */}
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">
                          {r.targetType}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5">
                          <AlertTriangle size={10} className="mr-1" />
                          {REASON_LABELS[r.reason] ?? r.reason}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        ID: {r.targetId}
                      </p>
                      {r.details && (
                        <p className="text-sm text-foreground">"{r.details}"</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2 flex-wrap">
                    {r.targetType === "post" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => window.open(`/post/${r.targetId}`, "_blank")}
                        >
                          <ExternalLink size={12} />
                          View post
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRemovePost(r.targetId, r.reportId)}
                          disabled={resolvingId === r.reportId}
                        >
                          <XCircle size={12} />
                          Remove post
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleResolve(r.reportId, "resolve")}
                      disabled={resolvingId === r.reportId}
                    >
                      <CheckCircle2 size={12} />
                      Resolve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => handleResolve(r.reportId, "dismiss")}
                      disabled={resolvingId === r.reportId}
                    >
                      <XCircle size={12} />
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* ── Users tab ────────────────────────────────────────── */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchUsers(search)}
                  placeholder="Search by email…"
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={() => fetchUsers(search)} disabled={loadingUsers}>
                {loadingUsers ? <Loader2 size={14} className="animate-spin" /> : "Search"}
              </Button>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                Search for a user by email to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.uid} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
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
                      <Badge variant="outline" className={`text-xs w-fit ${ROLE_COLORS[u.role] ?? ""}`}>
                        {u.role}
                      </Badge>
                    </div>
                    {u.role !== "admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={u.suspended
                          ? "gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          : "gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
                        }
                        disabled={suspendingId === u.uid}
                        onClick={() => handleSuspend(u.uid, !u.suspended)}
                      >
                        {suspendingId === u.uid ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : u.suspended ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <ShieldOff size={12} />
                        )}
                        {u.suspended ? "Reinstate" : "Suspend"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
