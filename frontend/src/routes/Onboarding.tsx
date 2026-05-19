import { useState } from "react";
import { HandHeart, Gift, Truck, Building2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { api, refreshToken } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const DEMO_CENTER = { lat: 43.5448, lng: -80.2482 }; // Guelph, ON

type Role = "needy" | "helper" | "driver" | "organization";

const HOME: Record<Role, string> = {
  needy: "/needy",
  helper: "/helper",
  driver: "/driver",
  organization: "/org",
};

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant / Café" },
  { value: "grocery", label: "Grocery / Food store" },
  { value: "retail", label: "Retail / Clothing" },
  { value: "office", label: "Office / Corporate" },
  { value: "food_bank", label: "Food bank / Nonprofit" },
  { value: "other", label: "Other" },
];

export default function Onboarding() {
  const [role, setRole] = useState<Role | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("other");
  const [loading, setLoading] = useState(false);
  const [demoLocation, setDemoLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleContinue() {
    if (!role) return;
    if (role === "organization" && !businessName.trim()) {
      setError("Please enter your organization's name.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const location = await new Promise<{ lat: number; lng: number }>((resolve) => {
        if (!navigator.geolocation) {
          setDemoLocation(true);
          resolve(DEMO_CENTER);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => { setDemoLocation(true); resolve(DEMO_CENTER); },
          { timeout: 5000 }
        );
      });

      const user = auth.currentUser!;

      await api("/api/v1/users/role", {
        method: "POST",
        body: JSON.stringify({
          role,
          display_name: role === "organization" ? businessName.trim() : user.displayName,
          location,
          ...(role === "organization" && {
            business_name: businessName.trim(),
            business_type: businessType,
          }),
        }),
      });

      await refreshToken();
      navigate(HOME[role]);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error("Onboarding error:", err);
    } finally {
      setLoading(false);
    }
  }

  const cards: { role: Role; icon: React.ReactNode; title: string; desc: string }[] = [
    {
      role: "needy",
      icon: <HandHeart size={32} />,
      title: "I need help",
      desc: "Request food or clothing nearby",
    },
    {
      role: "helper",
      icon: <Gift size={32} />,
      title: "I want to help",
      desc: "Share surplus food or clothing",
    },
    {
      role: "driver",
      icon: <Truck size={32} />,
      title: "I'm a driver",
      desc: "Deliver items to people in need",
    },
    {
      role: "organization",
      icon: <Building2 size={32} />,
      title: "We're an organization",
      desc: "Restaurant, office, food bank, or retailer with surplus",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">How will you use Bridge?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pick your role to get started.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {cards.map((c) => (
            <Card
              key={c.role}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent",
                role === c.role && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => setRole(c.role)}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <span className={role === c.role ? "text-primary" : "text-muted-foreground"}>
                  {c.icon}
                </span>
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {role === "organization" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Organization name</label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Green Leaf Restaurant"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Organization type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {demoLocation && (
          <Alert>
            <AlertDescription>Using a demo location for this session.</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button className="w-full" disabled={!role || loading} onClick={handleContinue}>
          {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
          Use my current location &amp; continue
        </Button>
      </div>
    </div>
  );
}
