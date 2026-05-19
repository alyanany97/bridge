import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../src/firebase";
import { useAuth } from "../../src/hooks/useAuth";
import { useRole } from "../../src/hooks/useRole";
import { api } from "../../src/api";

const ROLE_LABELS: Record<string, string> = {
  helper: "Helper",
  needy: "Needs help",
  driver: "Driver",
  organization: "Organization",
  admin: "Admin",
};

export default function Profile() {
  const router = useRouter();
  const { user } = useAuth();
  const { role } = useRole();

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/sign-in");
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your posts. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api("/api/v1/users/me", { method: "DELETE" });
              await signOut(auth);
              router.replace("/sign-in");
            } catch {
              Alert.alert("Error", "Couldn't delete account. Please try again.");
            }
          },
        },
      ]
    );
  }

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-6">Profile</Text>

        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center gap-4">
            <View className="h-14 w-14 rounded-full bg-indigo-600 items-center justify-center">
              <Text className="text-white text-xl font-bold">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {user.displayName ?? "User"}
              </Text>
              <Text className="text-sm text-gray-500">{user.email}</Text>
              {role && (
                <View className="mt-1 self-start bg-indigo-50 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-indigo-600 font-medium">
                    {ROLE_LABELS[role] ?? role}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <TouchableOpacity
            className="flex-row items-center gap-3 px-4 py-3.5 border-b border-gray-100"
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#4f46e5" />
            <Text className="text-base text-gray-800 flex-1">Sign out</Text>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <TouchableOpacity
            className="flex-row items-center gap-3 px-4 py-3.5"
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text className="text-base text-red-500 flex-1">Delete account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
