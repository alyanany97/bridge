import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Item {
  id: string;
  title: string;
  description: string;
  category: 'food' | 'clothing' | 'household' | 'other';
  images: string[];
  quantity: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  postedBy: string;
  createdAt: number;
  status: 'available' | 'claimed' | 'completed';
  claimedBy?: string;
}

export interface Delivery {
  id: string;
  itemId: string;
  itemTitle: string;
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
  driver?: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
  route?: Array<[number, number]>;
  eta?: number;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'helper' | 'receiver' | 'driver' | 'admin';
  phone?: string;
  bio?: string;
  stats: {
    itemsPosted: number;
    itemsClaimed: number;
    deliveriesCompleted: number;
    rating: number;
  };
}

interface AppStore {
  // User
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (value: boolean) => void;

  // Items
  items: Item[];
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  updateItem: (id: string, item: Partial<Item>) => void;
  removeItem: (id: string) => void;

  // Deliveries
  deliveries: Delivery[];
  setDeliveries: (deliveries: Delivery[]) => void;
  addDelivery: (delivery: Delivery) => void;
  updateDelivery: (id: string, delivery: Partial<Delivery>) => void;

  // Location
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (location: { lat: number; lng: number }) => void;

  // UI State
  loading: boolean;
  error: string | null;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // User
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

      // Items
      items: [],
      setItems: (items) => set({ items }),
      addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      // Deliveries
      deliveries: [],
      setDeliveries: (deliveries) => set({ deliveries }),
      addDelivery: (delivery) =>
        set((state) => ({
          deliveries: [delivery, ...state.deliveries],
        })),
      updateDelivery: (id, updates) =>
        set((state) => ({
          deliveries: state.deliveries.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      // Location
      userLocation: null,
      setUserLocation: (location) => set({ userLocation: location }),

      // UI
      loading: false,
      error: null,
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'bridge-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
