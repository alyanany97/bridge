import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { LogOut, RefreshCw, UserCircle } from "lucide-react";
import { auth, db } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  async function handleSwitchRole() {
    try {
      const userRef = doc(db, "users", user!.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const cycle: Record<string, string> = { needy: "helper", helper: "driver", driver: "needy" };
      const labels: Record<string, string> = { needy: "Needy", helper: "Helper", driver: "Driver" };
      const current = snap.data().role as string;
      const next = cycle[current] ?? "needy";
      await updateDoc(userRef, { role: next });
      toast.success(`Switched to ${labels[next]} mode`);
      const dest = next === "helper" ? "/helper" : next === "driver" ? "/driver" : "/needy";
      navigate(dest);
    } catch {
      toast.error("Couldn't switch role. Try again.");
    }
  }

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
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold leading-tight">
            {user.displayName ?? "User"}
          </span>
          <span className="text-xs font-normal text-muted-foreground truncate">
            {user.email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
          <UserCircle size={15} />
          Edit profile
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleSwitchRole} className="gap-2 cursor-pointer">
          <RefreshCw size={15} />
          Switch role
        </DropdownMenuItem>

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
