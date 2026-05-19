import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export type Role = "needy" | "helper" | "driver" | "organization" | "admin";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    user.getIdTokenResult().then((result) => {
      setRole((result.claims.role as Role) ?? null);
      setLoading(false);
    });
  }, [user, authLoading]);

  return { role, loading };
}
