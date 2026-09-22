import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Item } from '@/stores/appStore';

export default function BrowseScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const { items, loading, setLoading } = useAppStore();
  const [filtered, setFiltered] = useState<Item[]>([]);

  const categories = ['food', 'clothing', 'household', 'other'];

  useEffect(() => {
    filterItems();
  }, [search, category, items]);

  const filterItems = () => {
    let result = items;

    if (search) {
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      result = result.filter((item) => item.category === category);
    }

    setFiltered(result);
  };

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.itemCard}>
      <View style={styles.categoryBadge}>
        <ThemedText style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
          {item.category.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText type="subtitle" numberOfLines={1}>
        {item.title}
      </ThemedText>
      <ThemedText type="small" numberOfLines={2} style={{ marginVertical: 4, opacity: 0.7 }}>
        {item.description}
      </ThemedText>
      <View style={styles.footer}>
        <ThemedText type="small">Qty: {item.quantity}</ThemedText>
        <TouchableOpacity style={styles.claimBtn}>
          <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Claim</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Browse</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            placeholder="Search items..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#999"
          />
        </View>

        {/* Categories */}
        <View style={styles.categories}>
          <TouchableOpacity
            style={[styles.categoryBtn, !category && styles.categoryBtnActive]}
            onPress={() => setCategory(null)}
          >
            <ThemedText
              style={{
                color: !category ? '#fff' : '#16A34A',
                fontWeight: '600',
              }}
            >
              All
            </ThemedText>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <ThemedText
                style={{
                  color: category === cat ? '#fff' : '#16A34A',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Items */}
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
        ) : filtered.length > 0 ? (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            columnWrapperStyle={styles.row}
            numColumns={2}
          />
        ) : (
          <ThemedText style={{ textAlign: 'center', marginTop: 40 }}>
            No items found
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  categories: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  categoryBtnActive: {
    backgroundColor: '#16A34A',
  },
  row: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  itemCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  claimBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
