import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/hooks/useAuth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="post/new"
          options={{ headerShown: true, title: "New Post", presentation: "modal" }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{ headerShown: true, title: "Post", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="match/[id]"
          options={{ headerShown: true, title: "Delivery", headerBackTitle: "Back" }}
        />
      </Stack>
    </AuthProvider>
  );
}
