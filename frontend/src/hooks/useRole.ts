import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export type UserRole = "helper" | "needy" | "driver" | "organization" | "admin" | null;

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    user.getIdTokenResult().then((result) => {
      setRole((result.claims.role as UserRole) ?? null);
      setLoading(false);
    });
  }, [user, authLoading]);

  return { role, loading: authLoading || loading };
}
