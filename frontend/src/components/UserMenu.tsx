import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { LogOut, UserCircle, ShieldCheck } from "lucide-react";
import { auth } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABELS: Record<string, string> = {
  helper: "Helper",
  needy: "Needs help",
  driver: "Driver",
  organization: "Organization",
  admin: "Admin",
};

export default function UserMenu() {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  async function handleSignOut() {
    await signOut(auth);
    navigate("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "User"} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-sm font-semibold leading-tight">
            {user.displayName ?? "User"}
          </span>
          <span className="text-xs font-normal text-muted-foreground truncate">
            {user.email}
          </span>
          {role && (
            <Badge variant="outline" className="w-fit text-xs font-normal">
              {ROLE_LABELS[role] ?? role}
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
          <UserCircle size={15} />
          Edit profile
        </DropdownMenuItem>

        {role === "admin" && (
          <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer text-amber-600 focus:text-amber-600">
            <ShieldCheck size={15} />
            Admin panel
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut size={15} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
