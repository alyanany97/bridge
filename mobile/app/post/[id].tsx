import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../src/firebase";
import { api } from "../../src/api";
import { useRole } from "../../src/hooks/useRole";

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  open:      { bg: "bg-green-50",  text: "text-green-700",  label: "Open"      },
  matched:   { bg: "bg-blue-50",   text: "text-blue-700",   label: "Matched"   },
  fulfilled: { bg: "bg-gray-100",  text: "text-gray-500",   label: "Fulfilled" },
};

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { role } = useRole();
  const [post, setPost] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "posts", id), (snap) => {
      setPost(snap.exists() ? { postId: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  async function handleClaim() {
    if (!post) return;
    setClaiming(true);
    try {
      await api(`/api/v1/posts/${id}/claim`, { method: "POST" });
      Alert.alert("Claimed!", "You've claimed this post. Check your matches.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't claim post.");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Post not found.</Text>
      </View>
    );
  }

  const statusInfo = STATUS_STYLE[post.status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: post.status };
  const canClaim =
    post.status === "open" &&
    ((post.kind === "need" && (role === "helper" || role === "organization")) ||
     (post.kind === "offer" && role === "needy"));

  return (
    <>
      <Stack.Screen options={{ title: post.title || "Post" }} />
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20 }}>
        {post.imageUrl && (
          <Image
            source={{ uri: post.imageUrl }}
            className="w-full h-52 rounded-2xl mb-4 bg-gray-100"
            resizeMode="cover"
          />
        )}

        <View className="flex-row items-start justify-between gap-2 mb-3">
          <Text className="text-xl font-bold text-gray-900 flex-1">{post.title}</Text>
          <View className={`px-3 py-1 rounded-full ${statusInfo.bg}`}>
            <Text className={`text-xs font-semibold ${statusInfo.text}`}>{statusInfo.label}</Text>
          </View>
        </View>

        {post.category && (
          <View className="mb-3">
            <View className="self-start bg-indigo-50 px-3 py-1 rounded-full">
              <Text className="text-xs text-indigo-600 font-medium">{post.category}</Text>
            </View>
          </View>
        )}

        {post.description && (
          <Text className="text-base text-gray-700 mb-4 leading-relaxed">{post.description}</Text>
        )}

        {post.items && post.items.length > 0 && (
          <View className="mb-4 bg-gray-50 rounded-xl p-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Items</Text>
            {post.items.map((item: { name: string; quantity: number }, i: number) => (
              <View key={i} className="flex-row items-center gap-2 py-1">
                <View className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <Text className="text-sm text-gray-700">
                  {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {canClaim && (
          <TouchableOpacity
            className="mt-4 bg-indigo-600 rounded-xl py-4 items-center"
            onPress={handleClaim}
            disabled={claiming}
            activeOpacity={0.8}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {post.kind === "need" ? "Offer to help" : "Claim this offer"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}
