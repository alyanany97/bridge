import React from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/stores/appStore';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ActivityScreen() {
  const { user, deliveries } = useAppStore();

  const activities = [
    {
      id: '1',
      type: 'claim',
      title: 'Item Claimed',
      description: 'You claimed "Winter Jackets"',
      time: '2 hours ago',
      icon: 'checkmark-circle',
    },
    {
      id: '2',
      type: 'delivery',
      title: 'Delivery Accepted',
      description: 'Your delivery request was accepted',
      time: '5 hours ago',
      icon: 'car',
    },
    {
      id: '3',
      type: 'post',
      title: 'Item Posted',
      description: 'You posted "Canned Goods"',
      time: '1 day ago',
      icon: 'add-circle',
    },
  ];

  const renderActivity = ({ item }: any) => (
    <View style={styles.activityItem}>
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon as any} size={24} color="#16A34A" />
      </View>
      <View style={styles.activityContent}>
        <ThemedText type="subtitle">{item.title}</ThemedText>
        <ThemedText type="small" style={{ marginTop: 4, opacity: 0.7 }}>
          {item.description}
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ opacity: 0.5 }}>
        {item.time}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Activity</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ThemedText type="subtitle" style={{ fontSize: 24, fontWeight: '700' }}>
              {user?.stats.itemsPosted || 0}
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 4, opacity: 0.7 }}>
              Items Posted
            </ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText type="subtitle" style={{ fontSize: 24, fontWeight: '700' }}>
              {user?.stats.itemsClaimed || 0}
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 4, opacity: 0.7 }}>
              Items Claimed
            </ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText type="subtitle" style={{ fontSize: 24, fontWeight: '700' }}>
              {user?.stats.deliveriesCompleted || 0}
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 4, opacity: 0.7 }}>
              Deliveries
            </ThemedText>
          </View>
        </View>

        {/* Activities */}
        <ThemedText type="subtitle" style={{ marginTop: 24, marginBottom: 12 }}>
          Recent Activity
        </ThemedText>

        <FlatList
          data={activities}
          renderItem={renderActivity}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
});
