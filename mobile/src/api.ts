import { auth } from "./firebase";

const BASE = "https://bridge-api-878901906578.us-central1.run.app";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

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

export async function refreshToken(): Promise<void> {
  const user = auth.currentUser;
  if (user) await user.getIdToken(true);
}
