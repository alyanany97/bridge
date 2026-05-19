import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { api, refreshToken } from "../src/api";

type Role = "needy" | "helper" | "driver" | "organization";

const ROLES: { id: Role; label: string; description: string; emoji: string }[] = [
  { id: "needy", label: "I need help", description: "Find food, goods, and services near you", emoji: "🤝" },
  { id: "helper", label: "I want to help", description: "Offer goods and services to those in need", emoji: "💛" },
  { id: "driver", label: "I can deliver", description: "Pick up and deliver donations to people in need", emoji: "🚛" },
  { id: "organization", label: "Organization", description: "Manage donations and volunteers at scale", emoji: "🏢" },
];

export default function Onboarding() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    try {
      await api("/api/v1/users/role", { method: "POST", body: JSON.stringify({ role: selected }) });
      await refreshToken();
      router.replace("/");
    } catch (e) {
      Alert.alert("Error", "Couldn't save your role. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-bold text-gray-900">How would you like to help?</Text>
      <Text className="mt-1 text-base text-gray-500">Choose your role — you can change it later.</Text>

      <View className="mt-8 gap-3">
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.id}
            className={`rounded-xl border-2 p-4 ${
              selected === r.id ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white"
            }`}
            onPress={() => setSelected(r.id)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-3xl">{r.emoji}</Text>
              <View className="flex-1">
                <Text className={`text-base font-semibold ${selected === r.id ? "text-indigo-700" : "text-gray-900"}`}>
                  {r.label}
                </Text>
                <Text className="text-sm text-gray-500">{r.description}</Text>
              </View>
              {selected === r.id && (
                <View className="h-5 w-5 rounded-full bg-indigo-600 items-center justify-center">
                  <Text className="text-white text-xs font-bold">✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        className={`mt-8 rounded-xl py-4 items-center ${selected ? "bg-indigo-600" : "bg-gray-200"}`}
        onPress={handleConfirm}
        disabled={!selected || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className={`text-base font-semibold ${selected ? "text-white" : "text-gray-400"}`}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
