import { createContext, useContext, useState } from "react";
import type { UserRole } from "@/hooks/useRole";

type PreviewRole = Exclude<UserRole, "admin" | null>;

interface AdminPreviewContextValue {
  previewRole: PreviewRole | null;
  setPreviewRole: (role: PreviewRole | null) => void;
}

const AdminPreviewContext = createContext<AdminPreviewContextValue>({
  previewRole: null,
  setPreviewRole: () => {},
});

export function AdminPreviewProvider({ children }: { children: React.ReactNode }) {
  const [previewRole, setPreviewRole] = useState<PreviewRole | null>(null);
  return (
    <AdminPreviewContext.Provider value={{ previewRole, setPreviewRole }}>
      {children}
    </AdminPreviewContext.Provider>
  );
}

export function useAdminPreview() {
  return useContext(AdminPreviewContext);
}
