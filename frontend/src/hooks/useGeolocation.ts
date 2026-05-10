import { useState, useEffect } from "react";

const DEMO_CENTER = { lat: 43.5448, lng: -80.2482 }; // Guelph, ON

export function useGeolocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords(DEMO_CENTER);
      setIsDemo(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsDemo(false);
      },
      () => {
        setCoords(DEMO_CENTER);
        setIsDemo(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { coords, isDemo };
}
