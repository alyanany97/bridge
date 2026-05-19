import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Ionicons } from "@expo/vector-icons";
import { storage, auth } from "../../src/firebase";
import { api } from "../../src/api";

const CATEGORIES = ["food", "clothing", "household", "electronics", "transport", "other"];

type Item = { name: string; quantity: number };

export default function NewPost() {
  const { kind } = useLocalSearchParams<{ kind: "need" | "offer" }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadImage(uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const user = auth.currentUser!;
    const path = `posts/${user.uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }

  async function parsePhoto() {
    if (!imageUri) return;
    setParsing(true);
    try {
      setUploading(true);
      const url = await uploadImage(imageUri);
      setUploading(false);

      const result = await api<{ title?: string; description?: string; category?: string; items?: Item[] }>(
        "/api/v1/ai/parse-photo",
        { method: "POST", body: JSON.stringify({ photo_url: url, kind }) }
      );
      if (result.title && !title) setTitle(result.title);
      if (result.description && !description) setDescription(result.description);
      if (result.category) setCategory(result.category);
      if (result.items && result.items.length > 0) setItems(result.items);
    } catch {
      Alert.alert("Couldn't parse photo", "You can fill in the details manually.");
    } finally {
      setParsing(false);
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title for your post.");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageUri) {
        setUploading(true);
        imageUrl = await uploadImage(imageUri);
        setUploading(false);
      }

      await api("/api/v1/posts", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title: title.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          items: items.length > 0 ? items : undefined,
          image_url: imageUrl,
        }),
      });

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't create post.");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  const isOffer = kind === "offer";

  return (
    <>
      <Stack.Screen options={{ title: isOffer ? "Post an offer" : "Request help" }} />
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          {/* Photo picker */}
          <TouchableOpacity
            className="w-full h-44 rounded-2xl bg-gray-100 items-center justify-center mb-4 overflow-hidden"
            onPress={pickImage}
            activeOpacity={0.7}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="items-center gap-2">
                <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                <Text className="text-sm text-gray-400">Add a photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {imageUri && !parsing && (
            <TouchableOpacity
              className="mb-4 flex-row items-center justify-center gap-2 bg-indigo-50 rounded-xl py-3"
              onPress={parsePhoto}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles-outline" size={16} color="#4f46e5" />
              <Text className="text-sm text-indigo-600 font-medium">Fill in details with AI</Text>
            </TouchableOpacity>
          )}
          {parsing && (
            <View className="mb-4 flex-row items-center justify-center gap-2 bg-indigo-50 rounded-xl py-3">
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text className="text-sm text-indigo-600">{uploading ? "Uploading…" : "Parsing photo…"}</Text>
            </View>
          )}

          {/* Title */}
          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Title *</Text>
          <TextInput
            className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 border border-gray-200 mb-4"
            placeholder="e.g. Winter coats for family of 4"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />

          {/* Description */}
          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Description</Text>
          <TextInput
            className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 border border-gray-200 mb-4"
            placeholder="Optional details…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />

          {/* Category */}
          <Text className="text-sm font-semibold text-gray-700 mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                className={`px-3 py-1.5 rounded-full border ${
                  category === cat ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white"
                }`}
                onPress={() => setCategory(category === cat ? null : cat)}
                activeOpacity={0.7}
              >
                <Text className={`text-sm font-medium capitalize ${category === cat ? "text-indigo-600" : "text-gray-600"}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${title.trim() ? "bg-indigo-600" : "bg-gray-200"}`}
            onPress={handleSubmit}
            disabled={!title.trim() || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-base font-semibold ${title.trim() ? "text-white" : "text-gray-400"}`}>
                {isOffer ? "Post offer" : "Request help"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
