import { useRole, type UserRole } from "./useRole";
import { useAdminPreview } from "@/contexts/AdminPreviewContext";

/**
 * Returns the "effective" role for UI rendering.
 * For admins with a preview role active, returns the preview role.
 * Always exposes `isAdmin` so components can check the real admin status.
 */
export function useEffectiveRole() {
  const { role, loading } = useRole();
  const { previewRole } = useAdminPreview();

  const isAdmin = role === "admin";
  const effectiveRole: UserRole = isAdmin && previewRole ? previewRole : role;

  return { role: effectiveRole, loading, isAdmin };
}
