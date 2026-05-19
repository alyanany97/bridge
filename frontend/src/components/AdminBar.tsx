import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, HandHeart, Gift, Truck, Building2 } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useAdminPreview } from "@/contexts/AdminPreviewContext";
import { useAuth } from "@/hooks/useAuth";

const PUBLIC_PATHS = ["/", "/privacy", "/terms", "/onboarding"];

const PREVIEW_ROLES = [
  { value: null,           label: "Admin",  icon: <ShieldCheck size={11} />, path: "/admin" },
  { value: "helper",       label: "Helper", icon: <Gift size={11} />,        path: "/helper" },
  { value: "needy",        label: "Needy",  icon: <HandHeart size={11} />,   path: "/needy" },
  { value: "driver",       label: "Driver", icon: <Truck size={11} />,       path: "/driver" },
  { value: "organization", label: "Org",    icon: <Building2 size={11} />,   path: "/org" },
] as const;

export default function AdminBar() {
  const { role } = useRole();
  const { user } = useAuth();
  const { previewRole, setPreviewRole } = useAdminPreview();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!user || role !== "admin") return null;
  if (PUBLIC_PATHS.includes(pathname)) return null;

  const active = previewRole ?? null;

  return (
    <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-1.5">
      <div className="mx-auto flex max-w-screen-md items-center gap-2 text-xs">
        <span className="font-semibold text-amber-700 shrink-0">Admin preview:</span>
        <div className="flex gap-1 flex-wrap">
          {PREVIEW_ROLES.map((r) => {
            const isActive = active === r.value;
            return (
              <button
                key={r.label}
                onClick={() => {
                  setPreviewRole(r.value as any);
                  navigate(r.path);
                }}
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium transition-colors ${
                  isActive
                    ? "bg-amber-600 text-white"
                    : "text-amber-700 hover:bg-amber-100 border border-amber-300"
                }`}
              >
                {r.icon}
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
