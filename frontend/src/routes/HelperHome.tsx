import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import PageShell from "@/components/PageShell";
import MapView from "@/components/MapView";
import PostCard from "@/components/PostCard";
import CategoryFilter, { type Category } from "@/components/CategoryFilter";
import { usePosts, useMyPosts } from "@/hooks/usePosts";
import { useGeolocation } from "@/hooks/useGeolocation";

type Tab = "browse" | "mine";

export default function HelperHome() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("browse");
  const [category, setCategory] = useState<Category>("all");
  const { posts: browsePosts, loading: browseLoading, error } = usePosts("need");
  const { posts: myPosts, loading: myLoading } = useMyPosts("offer");
  const { coords, isDemo } = useGeolocation();

  const filtered =
    category === "all" ? browsePosts : browsePosts.filter((p) => p.category === category);

  return (
    <PageShell>
      <div className="space-y-4">
        {isDemo && (
          <Alert>
            <AlertDescription>
              Location unavailable — enable GPS in your browser settings for accurate results.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("browse")}
            className={`pb-2 px-1 text-sm font-medium transition-colors ${
              tab === "browse"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Browse needs
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`pb-2 px-1 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === "mine"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My offers
            {myPosts.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {myPosts.length}
              </Badge>
            )}
          </button>
        </div>

        {tab === "browse" && (
          <>
            <CategoryFilter value={category} onChange={setCategory} />
            {coords && <MapView center={coords} posts={filtered} />}
            <h2 className="text-lg font-semibold">Nearby needs</h2>
            {browseLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            )}
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            {!browseLoading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Map size={48} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No needs nearby right now.</p>
              </div>
            )}
            <div className="space-y-3">
              {filtered.map((post) => (
                <PostCard key={post.postId} post={post} userLocation={coords} />
              ))}
            </div>
          </>
        )}

        {tab === "mine" && (
          <>
            <h2 className="text-lg font-semibold">My offers</h2>
            {myLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            )}
            {!myLoading && myPosts.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Map size={48} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You haven't posted any offers yet.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {myPosts.map((post) => (
                <PostCard key={post.postId} post={post} userLocation={coords} showStatus allowDelete />
              ))}
            </div>
          </>
        )}
      </div>

      <Button
        size="lg"
        className="fixed bottom-6 right-6 gap-2 rounded-full shadow-lg"
        onClick={() => navigate("/post/new?kind=offer")}
      >
        <Plus size={20} />
        Post offer
      </Button>
    </PageShell>
  );
}
