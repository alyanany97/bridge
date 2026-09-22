import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useAppStore } from '@/stores/appStore';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, setAuthenticated } = useAppStore();

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          try {
            await signOut(auth);
            setUser(null);
            setAuthenticated(false);
            router.replace('/login');
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const menuItems = [
    {
      icon: 'heart',
      title: 'Saved Items',
      onPress: () => router.push('/saved'),
    },
    {
      icon: 'document-text',
      title: 'My Posts',
      onPress: () => router.push('/my-posts'),
    },
    {
      icon: 'car',
      title: 'My Deliveries',
      onPress: () => router.push('/my-deliveries'),
    },
    {
      icon: 'star',
      title: 'Reviews & Ratings',
      onPress: () => router.push('/reviews'),
    },
    {
      icon: 'settings',
      title: 'Settings',
      onPress: () => router.push('/settings'),
    },
    {
      icon: 'help-circle',
      title: 'Help & Support',
      onPress: () => router.push('/help'),
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#16A34A" />
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="title" style={{ fontSize: 20 }}>
              {user?.name}
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 4, opacity: 0.7 }}>
              {user?.email}
            </ThemedText>
            <View style={styles.roleContainer}>
              <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <View style={styles.ratingCard}>
            <View style={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < Math.floor(user?.stats.rating || 0) ? 'star' : 'star-outline'}
                  size={20}
                  color="#FDB022"
                />
              ))}
            </View>
            <ThemedText type="small" style={{ marginTop: 8 }}>
              {user?.stats.rating?.toFixed(1) || '0.0'} / 5.0
            </ThemedText>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={24} color="#16A34A" />
                <ThemedText style={{ marginLeft: 12, fontSize: 16 }}>
                  {item.title}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out" size={20} color="#DC2626" />
          <ThemedText style={{ marginLeft: 12, color: '#DC2626', fontWeight: '600' }}>
            Sign Out
          </ThemedText>
        </TouchableOpacity>

        {/* Footer */}
        <ThemedText type="small" style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>
          Bridge v1.0.0
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  roleContainer: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  ratingContainer: {
    marginBottom: 24,
  },
  ratingCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  menuContainer: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    justifyContent: 'center',
  },
});
