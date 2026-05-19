import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../src/firebase";
import { api } from "../../src/api";
import { useRole } from "../../src/hooks/useRole";

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-3 py-3 border-b border-gray-100">
      <Ionicons name={icon} size={18} color="#6b7280" />
      <View className="flex-1">
        <Text className="text-xs text-gray-400 mb-0.5">{label}</Text>
        <Text className="text-sm text-gray-900">{value}</Text>
      </View>
    </View>
  );
}

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { role } = useRole();
  const [match, setMatch] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "matches", id), (snap) => {
      setMatch(snap.exists() ? { matchId: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  async function markDelivered() {
    setActing(true);
    try {
      await api(`/api/v1/matches/${id}/deliver`, { method: "POST" });
      Alert.alert("Delivered!", "Great job completing this delivery.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't mark as delivered.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }

  if (!match) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Match not found.</Text>
      </View>
    );
  }

  const items = match.items as Array<{ name: string; quantity: number }> | undefined;
  const isDriver = role === "driver";
  const canDeliver = isDriver && match.status === "in_transit";

  return (
    <>
      <Stack.Screen options={{ title: "Delivery" }} />
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20 }}>
        <View className="bg-indigo-50 rounded-2xl p-4 mb-5">
          <Text className="text-lg font-bold text-indigo-900">
            {match.status === "in_transit" ? "In transit" : match.status === "delivered" ? "Delivered" : "Pending"}
          </Text>
          {items && items.length > 0 && (
            <Text className="text-sm text-indigo-700 mt-1">
              {items.map((it) => `${it.name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`).join(", ")}
            </Text>
          )}
        </View>

        {items && items.length > 0 && (
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Items</Text>
            {items.map((item, i) => (
              <View key={i} className="flex-row items-center gap-2 py-1">
                <View className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <Text className="text-sm text-gray-700">
                  {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="bg-white rounded-xl border border-gray-100">
          {match.pickupLocation && (
            <InfoRow
              icon="location-outline"
              label="Pick up"
              value={`${match.pickupLocation.lat.toFixed(4)}, ${match.pickupLocation.lng.toFixed(4)}`}
            />
          )}
          {match.dropoffLocation && (
            <InfoRow
              icon="navigate-outline"
              label="Drop off"
              value={`${match.dropoffLocation.lat.toFixed(4)}, ${match.dropoffLocation.lng.toFixed(4)}`}
            />
          )}
        </View>

        {canDeliver && (
          <TouchableOpacity
            className="mt-6 bg-green-600 rounded-xl py-4 items-center"
            onPress={markDelivered}
            disabled={acting}
            activeOpacity={0.8}
          >
            {acting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text className="text-white font-semibold text-base">Mark as delivered</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}
