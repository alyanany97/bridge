import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "../../src/hooks/useRole";

export default function TabsLayout() {
  const { role } = useRole();
  const isDriver = role === "driver";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4f46e5",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isDriver ? "Deliveries" : "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={isDriver ? "car-outline" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
