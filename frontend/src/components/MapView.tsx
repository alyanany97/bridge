import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { type Post } from "@/hooks/usePosts";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const pin = (color: string, active = false) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};width:${active ? 18 : 14}px;height:${active ? 18 : 14}px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [active ? 24 : 20, active ? 24 : 20],
    iconAnchor: [active ? 12 : 10, active ? 12 : 10],
  });

const userDot = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center">
    <div style="width:18px;height:18px;border-radius:9999px;background:rgba(37,99,235,0.18);display:flex;align-items:center;justify-content:center">
      <div style="width:10px;height:10px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>
    </div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const NEED_COLOR = "#dc2626";
const OFFER_COLOR = "#059669";

interface Props {
  center: { lat: number; lng: number };
  posts: Post[];
}

async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return [];
    return (data.routes[0].geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng]
    );
  } catch {
    return [];
  }
}

function FitRoute({ route }: { route: [number, number][] }) {
  const map = useMap();
  if (route.length > 1) {
    map.fitBounds(L.latLngBounds(route), { padding: [32, 32], maxZoom: 16 });
  }
  return null;
}

export default function MapView({ center, posts }: Props) {
  const navigate = useNavigate();
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  async function handlePinClick(post: Post) {
    if (!post.location) return;
    if (activePostId === post.postId) {
      setRoute(null);
      setActivePostId(null);
      return;
    }
    setActivePostId(post.postId);
    setRoute(null);
    setLoadingRoute(true);
    const coords = await fetchRoute(center, post.location);
    setRoute(coords.length ? coords : null);
    setLoadingRoute(false);
  }

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      className="h-60 w-full rounded-xl"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Your location */}
      <Marker position={[center.lat, center.lng]} icon={userDot} zIndexOffset={1000}>
        <Popup>
          <p className="text-xs font-medium">You are here</p>
        </Popup>
      </Marker>

      {/* Route polyline */}
      {route && (
        <>
          <Polyline
            positions={route}
            pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.65, dashArray: "10 6" }}
          />
          <FitRoute route={route} />
        </>
      )}

      {posts.map((post) =>
        post.location ? (
          <Marker
            key={post.postId}
            position={[post.location.lat, post.location.lng]}
            icon={pin(
              post.kind === "need" ? NEED_COLOR : OFFER_COLOR,
              activePostId === post.postId
            )}
            eventHandlers={{ click: () => handlePinClick(post) }}
          >
            <Popup>
              <div className="flex flex-col gap-2 p-1" style={{ minWidth: 120 }}>
                {post.photoURL && (
                  <img
                    src={post.photoURL}
                    alt={post.description}
                    className="h-20 w-full rounded object-cover"
                  />
                )}
                <p className="text-xs font-semibold">
                  {post.items.length > 0
                    ? (post.items[0] as { name: string }).name
                    : post.description.slice(0, 40)}
                </p>
                {loadingRoute && activePostId === post.postId && (
                  <p className="text-xs text-muted-foreground">Loading route…</p>
                )}
                <button
                  onClick={() => navigate(`/post/${post.postId}`)}
                  className="text-xs text-blue-600 underline"
                >
                  View details
                </button>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
