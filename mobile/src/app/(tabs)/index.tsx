import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/services/api';
import { useLocation } from '@/hooks/useLocation';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Item } from '@/stores/appStore';

export default function HomeScreen() {
  const router = useRouter();
  const { user, items, setItems, loading, setLoading } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const { error: locationError } = useLocation();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.getItems();
      setItems(response.data);
    } catch (error) {
      console.error('Error loading items:', error);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const handleItemPress = (item: Item) => {
    router.push({
      pathname: '/item/[id]',
      params: { id: item.id },
    });
  };

  const renderItemCard = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      {item.images.length > 0 && (
        <Image
          source={{ uri: item.images[0] }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.itemContent}>
        <ThemedText type="subtitle" numberOfLines={1}>
          {item.title}
        </ThemedText>
        <ThemedText type="small" numberOfLines={2} style={{ marginVertical: 4 }}>
          {item.description}
        </ThemedText>
        <View style={styles.itemMeta}>
          <Ionicons name="location" size={14} color="#16A34A" />
          <ThemedText type="small" style={{ marginLeft: 4 }}>
            {item.location.address}
          </ThemedText>
        </View>
        <View style={styles.itemFooter}>
          <View style={styles.badge}>
            <ThemedText
              type="small"
              style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}
            >
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ fontWeight: '600' }}>
            Qty: {item.quantity}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="small" style={{ opacity: 0.7 }}>
            Welcome back
          </ThemedText>
          <ThemedText type="title">{user?.name}</ThemedText>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle" size={40} color="#16A34A" />
        </TouchableOpacity>
      </View>

      {/* Location Error */}
      {locationError && (
        <View style={styles.alert}>
          <Ionicons name="warning" size={16} color="#EA580C" />
          <ThemedText type="small" style={{ marginLeft: 8, flex: 1 }}>
            {locationError}
          </ThemedText>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#16A34A' }]}
          onPress={() => router.push('/post-item')}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '600', marginTop: 8 }}>
            Post Item
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#0891B2' }]}
          onPress={() => router.push('/deliveries')}
        >
          <Ionicons name="car" size={24} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '600', marginTop: 8 }}>
            Deliveries
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#7C3AED' }]}
          onPress={() => router.push('/claims')}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '600', marginTop: 8 }}>
            My Claims
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={{ fontWeight: '700' }}>
            Available Items Near You
          </ThemedText>
          <TouchableOpacity onPress={() => router.push('/browse')}>
            <ThemedText style={{ color: '#16A34A', fontWeight: '600' }}>
              See All
            </ThemedText>
          </TouchableOpacity>
        </View>

        {items.length > 0 ? (
          <FlatList
            data={items.slice(0, 5)}
            renderItem={renderItemCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <ThemedText style={{ textAlign: 'center', marginVertical: 32 }}>
            No items available right now
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  alert: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  itemContent: {
    padding: 12,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  badge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
