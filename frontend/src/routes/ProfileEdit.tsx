import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Navigation, HandHeart, Gift, Truck } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PageShell from "@/components/PageShell";

type Role = "needy" | "helper" | "driver";

const HOME: Record<Role, string> = { needy: "/needy", helper: "/helper", driver: "/driver" };

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    // Build a short, readable address from components
    const a = data.address ?? {};
    const parts = [
      a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
      a.city || a.town || a.village || a.county,
      a.state,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : data.display_name ?? "";
  } catch {
    return "";
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

const roleCards: { role: Role; icon: React.ReactNode; title: string; desc: string }[] = [
  { role: "needy",  icon: <HandHeart size={28} />, title: "I need help",    desc: "Request food or clothing nearby" },
  { role: "helper", icon: <Gift size={28} />,      title: "I want to help", desc: "Share food or clothing nearby" },
  { role: "driver", icon: <Truck size={28} />,     title: "I'm a driver",   desc: "Pick up and deliver items" },
];

export default function ProfileEdit() {
  const navigate = useNavigate();
  const user = auth.currentUser!;

  const [name, setName] = useState(user.displayName ?? "");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Load existing profile
  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) { setLoadingProfile(false); return; }
      const data = snap.data();
      setRole(data.role ?? null);
      if (data.location) {
        setCoords(data.location);
        const addr = await reverseGeocode(data.location.lat, data.location.lng);
        setAddress(addr);
      }
      setLoadingProfile(false);
    }
    load();
  }, [user.uid]);

  async function handleUseGPS() {
    if (!navigator.geolocation) {
      setGeoError("GPS not available in this browser.");
      return;
    }
    setGpsLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        const addr = await reverseGeocode(c.lat, c.lng);
        setAddress(addr);
        setGpsLoading(false);
      },
      () => {
        setGeoError("Couldn't get your location. Check browser permissions.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSave() {
    if (!role) { toast.error("Please select a role."); return; }
    setSaving(true);
    try {
      // Resolve address → coords if address was manually typed
      let finalCoords = coords;
      if (address.trim() && !coords) {
        finalCoords = await geocodeAddress(address.trim());
        if (!finalCoords) {
          toast.error("Couldn't find that address. Try being more specific.");
          setSaving(false);
          return;
        }
        setCoords(finalCoords);
      }

      // If address field was changed after GPS load, re-geocode
      if (address.trim() && coords) {
        const recoded = await geocodeAddress(address.trim());
        if (recoded) {
          finalCoords = recoded;
          setCoords(recoded);
        }
      }

      // Update Firebase Auth display name
      if (name.trim() && name.trim() !== user.displayName) {
        await updateProfile(user, { displayName: name.trim() });
      }

      // Update Firestore profile
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name.trim() || user.displayName,
        role,
        ...(finalCoords ? { location: finalCoords } : {}),
      });

      toast.success("Profile saved!");
      navigate(HOME[role]);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingProfile) {
    return (
      <PageShell>
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6 pb-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 pl-0">
          <ArrowLeft size={16} />
          Back
        </Button>

        <div>
          <h1 className="text-xl font-semibold">Edit profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your name, location, and role.
          </p>
        </div>

        <Separator />

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Display name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <p className="text-xs text-muted-foreground">
            Used to show you nearby posts and calculate distances.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={address}
                onChange={(e) => { setAddress(e.target.value); setCoords(null); }}
                placeholder="Enter your address or city"
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleUseGPS}
              disabled={gpsLoading}
              title="Use my current GPS location"
            >
              {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
            </Button>
          </div>
          {coords && (
            <p className="text-xs text-muted-foreground">
              Coordinates: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
          {geoError && (
            <Alert variant="destructive">
              <AlertDescription>{geoError}</AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Role */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Role</label>
          <div className="grid grid-cols-1 gap-3">
            {roleCards.map((c) => (
              <Card
                key={c.role}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-accent",
                  role === c.role && "border-primary ring-2 ring-primary/20"
                )}
                onClick={() => setRole(c.role)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <span className={role === c.role ? "text-primary" : "text-muted-foreground"}>
                    {c.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saving || !role}>
          {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>
    </PageShell>
  );
}
