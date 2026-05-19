/**
 * Driver location via Firebase Realtime Database.
 *
 * Two modes:
 *   publish — driver continuously writes their GPS position to RTDB.
 *             Called in DriverHome when they have an active match.
 *   subscribe — helper/needy reads the driver's position in real-time.
 *              Called in MatchStatus to show live driver position on map.
 *
 * RTDB path: /locations/{driverId}
 * Structure: { lat, lng, heading, speed, updatedAt, matchId }
 *
 * Why RTDB not Firestore: RTDB is priced by bandwidth, not per-write operation.
 * 10 drivers sending GPS every 4 seconds = ~1,200 writes/hour. At Firestore
 * pricing that's money; on RTDB the ~60KB/hour of GPS data is negligible.
 */
import { useEffect, useRef, useState } from "react";
import { ref, set, remove, onValue, off } from "firebase/database";
import { rtdb } from "@/firebase";

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  updatedAt: number;
}

// ── Publish mode (driver) ──────────────────────────────────────────────────

/**
 * Call this in the driver's active delivery screen.
 * Starts a GPS watch and pushes updates to RTDB every ~4 seconds.
 * Cleans up (removes the RTDB node) when matchId becomes null.
 */
export function usePublishDriverLocation(driverId: string | null, matchId: string | null) {
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL_MS = 4000;

  useEffect(() => {
    if (!driverId || !matchId) {
      // Clear location from RTDB when not on an active delivery
      if (driverId) remove(ref(rtdb, `locations/${driverId}`)).catch(() => {});
      return;
    }

    if (!navigator.geolocation) return;

    const locationRef = ref(rtdb, `locations/${driverId}`);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        // Throttle writes — only push if enough time has passed or speed changed significantly
        if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
        lastUpdateRef.current = now;

        set(locationRef, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          updatedAt: now,
          matchId,
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Remove location node when driver leaves the screen / delivery ends
      remove(locationRef).catch(() => {});
    };
  }, [driverId, matchId]);
}

// ── Subscribe mode (helper / needy) ───────────────────────────────────────

/**
 * Subscribe to a driver's live location.
 * Returns null until the driver has published at least one update.
 */
export function useDriverLocation(driverId: string | null): DriverLocation | null {
  const [location, setLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    if (!driverId) { setLocation(null); return; }

    const locationRef = ref(rtdb, `locations/${driverId}`);
    onValue(locationRef, (snap) => {
      setLocation(snap.exists() ? (snap.val() as DriverLocation) : null);
    });

    return () => off(locationRef);
  }, [driverId]);

  return location;
}
