import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

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
import AdminPanel from "@/routes/AdminPanel";
import PrivacyPolicy from "@/routes/PrivacyPolicy";
import TermsOfService from "@/routes/TermsOfService";

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

        {/* Individual roles */}
        <Route path="/helper" element={<AuthGate><HelperHome /></AuthGate>} />
        <Route path="/needy" element={<AuthGate><NeedyHome /></AuthGate>} />
        <Route path="/driver" element={<AuthGate><DriverHome /></AuthGate>} />

        {/* Organization — same feed as helper for now, diverges in Phase 4 */}
        <Route path="/org" element={<AuthGate><HelperHome /></AuthGate>} />

        {/* Shared routes */}
        <Route path="/post/new" element={<AuthGate><PostNew /></AuthGate>} />
        <Route path="/post/:id" element={<AuthGate><PostDetail /></AuthGate>} />
        <Route path="/post/:id/edit" element={<AuthGate><PostEdit /></AuthGate>} />
        <Route path="/profile" element={<AuthGate><ProfileEdit /></AuthGate>} />
        <Route path="/match/:id" element={<AuthGate><MatchStatus /></AuthGate>} />

        {/* Admin — role check happens inside AdminPanel */}
        <Route path="/admin" element={<AuthGate><AdminPanel /></AuthGate>} />

        {/* Public legal pages — no auth required */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </BrowserRouter>
  );
}
