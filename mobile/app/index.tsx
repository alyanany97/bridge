import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/hooks/useAuth";
import { useRole } from "../src/hooks/useRole";

const ROLE_HOME: Record<string, string> = {
  needy: "/(tabs)",
  helper: "/(tabs)",
  organization: "/(tabs)",
  driver: "/(tabs)",
  admin: "/(tabs)",
};

export default function Index() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  useEffect(() => {
    if (authLoading || (user && roleLoading)) return;

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    if (!role) {
      router.replace("/onboarding");
      return;
    }

    router.replace((ROLE_HOME[role] ?? "/(tabs)") as any);
  }, [user, authLoading, role, roleLoading]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );
}
