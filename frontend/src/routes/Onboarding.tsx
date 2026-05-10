import { useState } from "react";
import { HandHeart, Gift, Truck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const DEMO_CENTER = { lat: 43.5448, lng: -80.2482 }; // Guelph, ON

type Role = "needy" | "helper" | "driver";

const HOME: Record<Role, string> = {
  needy:  "/needy",
  helper: "/helper",
  driver: "/driver",
};

export default function Onboarding() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLocation, setDemoLocation] = useState(false);
  const navigate = useNavigate();

  async function handleContinue() {
    if (!role) return;
    setLoading(true);
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
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role,
        location,
        createdAt: serverTimestamp(),
      });

      navigate(HOME[role]);
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
      desc: "Share food or clothing nearby",
    },
    {
      role: "driver",
      icon: <Truck size={32} />,
      title: "I'm a driver",
      desc: "Pick up and deliver items to people in need",
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

        {demoLocation && (
          <Alert>
            <AlertDescription>We'll use a demo location for this session.</AlertDescription>
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
