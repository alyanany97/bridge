import { useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../src/firebase";
import { useAuth } from "../src/hooks/useAuth";

WebBrowser.maybeCompleteAuthSession();

// Add your Google OAuth Client IDs here from Google Cloud Console:
// https://console.cloud.google.com/apis/credentials?project=helper-495902
const IOS_CLIENT_ID = "";     // iOS OAuth Client ID
const WEB_CLIENT_ID = "";     // Web OAuth Client ID

export default function SignIn() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID || undefined,
    webClientId: WEB_CLIENT_ID || undefined,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch(console.error);
    }
  }, [response]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-6">
      <View className="flex-1 items-center justify-center gap-6">
        <View className="items-center gap-3">
          <Text className="text-4xl font-bold text-indigo-600">Bridge</Text>
          <Text className="text-lg text-gray-600 text-center">
            Connecting those who need help{"\n"}with those who can give it
          </Text>
        </View>

        <TouchableOpacity
          className="w-full flex-row items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-4 shadow-sm"
          onPress={() => promptAsync()}
          disabled={!request}
          activeOpacity={0.7}
        >
          <Text className="text-base font-semibold text-gray-700">
            Continue with Google
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="pb-8 text-center text-xs text-gray-400">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}
