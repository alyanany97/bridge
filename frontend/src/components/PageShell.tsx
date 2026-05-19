import { HandHeart } from "lucide-react";
import { ReactNode } from "react";
import UserMenu from "./UserMenu";
import ChatDrawer from "./ChatDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

export default function PageShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  useNotifications(user?.uid ?? null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <HandHeart size={20} className="text-primary" />
            <span className="font-semibold">Bridge</span>
          </div>
          <div className="flex items-center gap-1">
            <ChatDrawer />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-md px-4 py-6">{children}</main>
    </div>
  );
}
