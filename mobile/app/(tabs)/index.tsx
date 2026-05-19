import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  collection, query, where, orderBy, limit, onSnapshot, DocumentData,
} from "firebase/firestore";
import { db } from "../../src/firebase";
import { useAuth } from "../../src/hooks/useAuth";
import { useRole } from "../../src/hooks/useRole";
import { api } from "../../src/api";

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(seconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_COLOR: Record<string, string> = {
  open: "text-green-700 bg-green-50",
  matched: "text-blue-700 bg-blue-50",
  fulfilled: "text-gray-500 bg-gray-100",
  in_transit: "text-blue-700 bg-blue-50",
  delivered: "text-gray-500 bg-gray-100",
};

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post, onPress }: { post: DocumentData; onPress: () => void }) {
  const ago = post.createdAt ? timeAgo(post.createdAt.seconds) : "";
  const statusStyle = STATUS_COLOR[post.status] ?? "text-gray-600 bg-gray-100";

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {post.title || "Post"}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">{ago}</Text>
        </View>
        <View className={`px-2 py-0.5 rounded-full ${statusStyle.split(" ")[1]}`}>
          <Text className={`text-xs font-medium ${statusStyle.split(" ")[0]}`}>
            {post.status}
          </Text>
        </View>
      </View>
      {post.description ? (
        <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>
          {post.description}
        </Text>
      ) : null}
      {post.category ? (
        <View className="mt-2 flex-row">
          <View className="bg-indigo-50 rounded-full px-2 py-0.5">
            <Text className="text-xs text-indigo-600">{post.category}</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  onPress,
  onAccept,
}: {
  match: DocumentData;
  onPress: () => void;
  onAccept?: () => void;
}) {
  const ago = match.createdAt ? timeAgo(match.createdAt.seconds) : "";
  const items = match.items as Array<{ name: string; quantity: number }> | undefined;

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {items && items.length > 0
              ? items.map((it) => `${it.name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`).join(", ")
              : "Delivery"}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">{ago}</Text>
        </View>
        <View className={`px-2 py-0.5 rounded-full ${match.status === "in_transit" ? "bg-blue-50" : "bg-gray-100"}`}>
          <Text className={`text-xs font-medium ${match.status === "in_transit" ? "text-blue-700" : "text-gray-500"}`}>
            {match.status === "in_transit" ? "In transit" : match.status}
          </Text>
        </View>
      </View>
      {onAccept && (
        <TouchableOpacity
          className="mt-3 bg-indigo-600 rounded-xl py-2.5 items-center"
          onPress={(e) => { onAccept(); }}
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-semibold">Accept delivery</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: keyof typeof Ionicons.glyphMap; message: string }) {
  return (
    <View className="flex-1 items-center justify-center py-20 gap-3">
      <Ionicons name={icon} size={48} color="#d1d5db" />
      <Text className="text-sm text-gray-400 text-center">{message}</Text>
    </View>
  );
}

// ─── HelperNeedyHome ─────────────────────────────────────────────────────────

function HelperNeedyHome({ kind }: { kind: "offer" | "need" }) {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [browsePosts, setBrowsePosts] = useState<DocumentData[]>([]);
  const [myPosts, setMyPosts] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const browseKind = kind === "offer" ? "need" : "offer";

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      where("kind", "==", browseKind),
      where("status", "==", "open"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setBrowsePosts(snap.docs.map((d) => ({ postId: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [browseKind]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "posts"),
      where("userId", "==", user.uid),
      where("kind", "==", kind),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMyPosts(snap.docs.map((d) => ({ postId: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, kind]);

  const browseLabel = kind === "offer" ? "Browse needs" : "Available nearby";
  const myLabel = kind === "offer" ? "My offers" : "My requests";
  const emptyBrowse = kind === "offer" ? "No needs nearby right now." : "No offers nearby right now.";
  const newPostKind = kind === "offer" ? "offer" : "need";

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-2 pb-0">
        <Text className="text-2xl font-bold text-gray-900">Bridge</Text>
        <View className="flex-row gap-4 mt-3 border-b border-gray-200">
          <TouchableOpacity
            className={`pb-2 ${tab === "browse" ? "border-b-2 border-indigo-600" : ""}`}
            onPress={() => setTab("browse")}
          >
            <Text className={`text-sm font-medium ${tab === "browse" ? "text-indigo-600" : "text-gray-500"}`}>
              {browseLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`pb-2 ${tab === "mine" ? "border-b-2 border-indigo-600" : ""}`}
            onPress={() => setTab("mine")}
          >
            <Text className={`text-sm font-medium ${tab === "mine" ? "text-indigo-600" : "text-gray-500"}`}>
              {myLabel}
              {myPosts.length > 0 ? ` (${myPosts.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === "browse" ? (
        loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            data={browsePosts}
            keyExtractor={(item) => item.postId}
            contentContainerStyle={{ padding: 16, paddingTop: 12 }}
            renderItem={({ item }) => (
              <PostCard post={item} onPress={() => router.push(`/post/${item.postId}`)} />
            )}
            ListEmptyComponent={<EmptyState icon="map-outline" message={emptyBrowse} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} colors={["#4f46e5"]} />
            }
          />
        )
      ) : (
        <FlatList
          data={myPosts}
          keyExtractor={(item) => item.postId}
          contentContainerStyle={{ padding: 16, paddingTop: 12 }}
          renderItem={({ item }) => (
            <PostCard post={item} onPress={() => router.push(`/post/${item.postId}`)} />
          )}
          ListEmptyComponent={<EmptyState icon="document-outline" message="You haven't posted anything yet." />}
        />
      )}

      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-indigo-600 rounded-full px-5 py-3.5 flex-row items-center gap-2 shadow-lg"
        onPress={() => router.push(`/post/new?kind=${newPostKind}`)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text className="text-white font-semibold text-sm">
          {kind === "offer" ? "Post offer" : "Request help"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── DriverHome ───────────────────────────────────────────────────────────────

function DriverHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [pending, setPending] = useState<DocumentData[]>([]);
  const [mine, setMine] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "matches"),
      where("status", "==", "pending"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPending(snap.docs.map((d) => ({ matchId: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "matches"),
      where("driverId", "==", user.uid),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMine(snap.docs.map((d) => ({ matchId: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  async function acceptDelivery(matchId: string) {
    setAccepting(matchId);
    try {
      await api(`/api/v1/matches/${matchId}/accept`, { method: "POST" });
      router.push(`/match/${matchId}`);
    } catch {
      Alert.alert("Error", "Couldn't accept delivery. Please try again.");
    } finally {
      setAccepting(null);
    }
  }

  const active = mine.filter((m) => m.status === "in_transit");
  const completed = mine.filter((m) => m.status === "delivered");

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-2 pb-0">
        <Text className="text-2xl font-bold text-gray-900">Bridge</Text>
        <View className="flex-row gap-4 mt-3 border-b border-gray-200">
          <TouchableOpacity
            className={`pb-2 ${tab === "available" ? "border-b-2 border-indigo-600" : ""}`}
            onPress={() => setTab("available")}
          >
            <Text className={`text-sm font-medium ${tab === "available" ? "text-indigo-600" : "text-gray-500"}`}>
              Available{pending.length > 0 ? ` (${pending.length})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`pb-2 ${tab === "mine" ? "border-b-2 border-indigo-600" : ""}`}
            onPress={() => setTab("mine")}
          >
            <Text className={`text-sm font-medium ${tab === "mine" ? "text-indigo-600" : "text-gray-500"}`}>
              My deliveries{active.length > 0 ? ` (${active.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === "available" ? (
        loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            data={pending}
            keyExtractor={(item) => item.matchId}
            contentContainerStyle={{ padding: 16, paddingTop: 12 }}
            renderItem={({ item }) => (
              <MatchCard
                match={item}
                onPress={() => router.push(`/match/${item.matchId}`)}
                onAccept={() => acceptDelivery(item.matchId)}
              />
            )}
            ListEmptyComponent={<EmptyState icon="cube-outline" message="No deliveries waiting right now." />}
          />
        )
      ) : (
        <FlatList
          data={mine}
          keyExtractor={(item) => item.matchId}
          contentContainerStyle={{ padding: 16, paddingTop: 12 }}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onPress={() => router.push(`/match/${item.matchId}`)}
            />
          )}
          ListEmptyComponent={<EmptyState icon="car-outline" message="You haven't accepted any deliveries yet." />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { role, loading } = useRole();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (role === "driver") return <DriverHome />;
  if (role === "helper" || role === "organization") return <HelperNeedyHome kind="offer" />;
  return <HelperNeedyHome kind="need" />;
}
