import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";
import SignIn from "@/routes/SignIn";
import Onboarding from "@/routes/Onboarding";
import HelperHome from "@/routes/HelperHome";
import NeedyHome from "@/routes/NeedyHome";
import PostNew from "@/routes/PostNew";
import PostDetail from "@/routes/PostDetail";
import PostEdit from "@/routes/PostEdit";
import MatchStatus from "@/routes/MatchStatus";
import DriverHome from "@/routes/DriverHome";
import ProfileEdit from "@/routes/ProfileEdit";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/onboarding" element={<AuthGate><Onboarding /></AuthGate>} />
        <Route path="/helper" element={<AuthGate><HelperHome /></AuthGate>} />
        <Route path="/needy" element={<AuthGate><NeedyHome /></AuthGate>} />
        <Route path="/post/new" element={<AuthGate><PostNew /></AuthGate>} />
        <Route path="/post/:id" element={<AuthGate><PostDetail /></AuthGate>} />
        <Route path="/post/:id/edit" element={<AuthGate><PostEdit /></AuthGate>} />
        <Route path="/profile" element={<AuthGate><ProfileEdit /></AuthGate>} />
        <Route path="/driver" element={<AuthGate><DriverHome /></AuthGate>} />
        <Route path="/match/:id" element={<AuthGate><MatchStatus /></AuthGate>} />
      </Routes>
    </BrowserRouter>
  );
}

export function HelloBridge() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="flex items-center gap-3">
        <HandHeart size={48} className="text-primary" />
        <span className="text-2xl font-semibold tracking-tight">Bridge</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Connecting people who need help with people ready to help.
      </p>
      <div className="flex gap-3">
        <Button>Primary (emerald)</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
    </div>
  );
}
