import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Navigation, Building2, Truck, HandHeart, Gift, Trash2 } from "lucide-react";
import { updateProfile, signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";

const ROLE_HOME: Record<string, string> = {
  needy: "/needy",
  helper: "/helper",
  driver: "/driver",
  organization: "/org",
  admin: "/admin",
};

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  needy:        { label: "Needs help",    icon: <HandHeart size={13} />, color: "bg-red-50 text-red-700 border-red-200" },
  helper:       { label: "Helper",        icon: <Gift size={13} />,      color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  driver:       { label: "Driver",        icon: <Truck size={13} />,     color: "bg-blue-50 text-blue-700 border-blue-200" },
  organization: { label: "Organization",  icon: <Building2 size={13} />, color: "bg-violet-50 text-violet-700 border-violet-200" },
  admin:        { label: "Admin",         icon: null,                    color: "bg-amber-50 text-amber-700 border-amber-200" },
};

const VEHICLE_TYPES = [
  { value: "walking", label: "On foot" },
  { value: "bike", label: "Bicycle" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van / Truck" },
];

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant / Café" },
  { value: "grocery", label: "Grocery / Food store" },
  { value: "retail", label: "Retail / Clothing" },
  { value: "office", label: "Office / Corporate" },
  { value: "food_bank", label: "Food bank / Nonprofit" },
  { value: "other", label: "Other" },
];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
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

export default function ProfileEdit() {
  const navigate = useNavigate();
  const user = auth.currentUser!;
  const { role, loading: roleLoading, isAdmin } = useEffectiveRole();

  const [name, setName] = useState(user.displayName ?? "");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Driver fields
  const [vehicleType, setVehicleType] = useState("car");
  // Org fields
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("other");
  const [website, setWebsite] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (roleLoading) return;
    async function load() {
      // Fetch the profile via API instead of direct Firestore read
      try {
        const profile = await api<Record<string, any>>("/api/v1/users/me");
        setBio(profile.bio ?? "");
        setVehicleType(profile.vehicleType ?? "car");
        setBusinessName(profile.businessName ?? "");
        setBusinessType(profile.businessType ?? "other");
        setWebsite(profile.website ?? "");
        if (profile.location) {
          setCoords(profile.location);
          const addr = await reverseGeocode(profile.location.lat, profile.location.lng);
          setAddress(addr);
        }
      } catch {
        // Swallow — fields will just be empty
      }
      setLoadingProfile(false);
    }
    load();
  }, [roleLoading]);

  async function handleUseGPS() {
    if (!navigator.geolocation) { setGeoError("GPS not available."); return; }
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
    setSaving(true);
    try {
      let finalCoords = coords;
      if (address.trim()) {
        const recoded = await geocodeAddress(address.trim());
        if (recoded) { finalCoords = recoded; setCoords(recoded); }
      }

      if (name.trim() && name.trim() !== user.displayName) {
        await updateProfile(user, { displayName: name.trim() });
      }

      // Build update payload — never include role
      const updates: Record<string, any> = {
        displayName: name.trim() || user.displayName,
        bio: bio.trim(),
        ...(finalCoords ? { location: finalCoords } : {}),
      };
      if (role === "driver") updates.vehicleType = vehicleType;
      if (role === "organization") {
        updates.businessName = businessName.trim();
        updates.businessType = businessType;
        updates.website = website.trim();
      }

      // Use the API endpoint (respects validation + never touches role)
      await api("/api/v1/users/profile", {
        method: "PUT",
        body: JSON.stringify({
          display_name: name.trim() || undefined,
          bio: bio.trim() || undefined,
          location: finalCoords ?? undefined,
          vehicle_type: role === "driver" ? vehicleType : undefined,
          business_name: role === "organization" ? businessName.trim() : undefined,
          business_type: role === "organization" ? businessType : undefined,
          website: role === "organization" && website.trim() ? website.trim() : undefined,
        }),
      });

      toast.success("Profile saved!");
      navigate(ROLE_HOME[role ?? "needy"]);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api("/api/v1/users/me", { method: "DELETE" });
      await signOut(auth);
      navigate("/");
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  if (loadingProfile || roleLoading) {
    return (
      <PageShell>
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  const roleMeta = ROLE_LABELS[role ?? "needy"];

  return (
    <PageShell>
      <div className="space-y-6 pb-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 pl-0">
          <ArrowLeft size={16} />
          Back
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Edit profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Update your details.</p>
          </div>
          {roleMeta && (
            <Badge variant="outline" className={`flex items-center gap-1 text-xs ${roleMeta.color}`}>
              {roleMeta.icon}
              {roleMeta.label}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {role === "organization" ? "Organization name" : "Display name"}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={role === "organization" ? "Your organization's name" : "Your name"}
            maxLength={100}
          />
        </div>

        {/* Bio */}
        {role !== "admin" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bio</label>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short description about yourself"
              maxLength={300}
            />
          </div>
        )}

        {/* Driver-specific */}
        {role === "driver" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Vehicle type</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {VEHICLE_TYPES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Organization-specific */}
        {role === "organization" && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Organization type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Website <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourorg.com"
                maxLength={200}
              />
            </div>
          </>
        )}

        {/* Location */}
        {role !== "admin" && (
          <>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <p className="text-xs text-muted-foreground">
                Used to show nearby posts and calculate distances.
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
                <Button type="button" variant="outline" size="icon" onClick={handleUseGPS} disabled={gpsLoading}>
                  {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                </Button>
              </div>
              {coords && (
                <p className="text-xs text-muted-foreground">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              )}
              {geoError && (
                <Alert variant="destructive">
                  <AlertDescription>{geoError}</AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
          Save changes
        </Button>

        {/* Danger zone — not shown for admin previewing another role */}
        {!isAdmin && (
          <>
            <Separator />
            <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">Danger zone</p>
              <p className="text-xs text-muted-foreground">
                Permanently deletes your account, all your posts, and all associated data. This cannot be undone.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={14} />
                Delete my account
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your posts, and cancel any active deliveries.
              This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Keep my account
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
