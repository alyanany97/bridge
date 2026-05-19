import { auth } from "./firebase";

const BASE = import.meta.env.VITE_BACKEND_URL as string;

/**
 * Authenticated fetch wrapper. All paths should be relative to the API root,
 * e.g. "/api/v1/posts". The token is always fresh (Firebase auto-refreshes).
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  // Force-refresh=false uses the cached token (refreshes automatically when expired)
  const token = await user.getIdToken(false);

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Force-refreshes the Firebase ID token, picking up any newly set custom claims
 * (e.g. after onboarding sets the user's role).
 */
export async function refreshToken(): Promise<void> {
  const user = auth.currentUser;
  if (user) await user.getIdToken(true);
}

export type ReportReason = "spam" | "inappropriate" | "offensive" | "fake" | "other";
export type ReportTargetType = "post" | "user" | "message";

export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  details?: string,
): Promise<void> {
  await api("/api/v1/reports", {
    method: "POST",
    body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details }),
  });
}

export async function blockUser(uid: string): Promise<void> {
  await api(`/api/v1/users/${uid}/block`, { method: "POST" });
}

export async function unblockUser(uid: string): Promise<void> {
  await api(`/api/v1/users/${uid}/block`, { method: "DELETE" });
}
