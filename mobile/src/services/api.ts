import axios from 'axios';
import { auth } from './firebase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://helper-495902.cloudfunctions.net';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to all requests
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      auth.signOut();
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Items
  getItems: (filters?: { type?: string; location?: [number, number]; radius?: number }) =>
    apiClient.get('/items', { params: filters }),
  createItem: (data: any) => apiClient.post('/items', data),
  getItem: (id: string) => apiClient.get(`/items/${id}`),
  updateItem: (id: string, data: any) => apiClient.put(`/items/${id}`, data),
  deleteItem: (id: string) => apiClient.delete(`/items/${id}`),
  claimItem: (id: string) => apiClient.post(`/items/${id}/claim`, {}),
  completeItem: (id: string) => apiClient.post(`/items/${id}/complete`, {}),

  // Deliveries
  getDeliveries: (filters?: any) => apiClient.get('/deliveries', { params: filters }),
  createDelivery: (data: any) => apiClient.post('/deliveries', data),
  getDelivery: (id: string) => apiClient.get(`/deliveries/${id}`),
  acceptDelivery: (id: string) => apiClient.post(`/deliveries/${id}/accept`, {}),
  updateDeliveryStatus: (id: string, status: string) =>
    apiClient.patch(`/deliveries/${id}`, { status }),

  // AI Vision - analyze image
  analyzeImage: (formData: FormData) =>
    apiClient.post('/ai/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Location/Maps
  getRoute: (from: [number, number], to: [number, number]) =>
    apiClient.get('/maps/route', { params: { from, to } }),
  geocode: (address: string) => apiClient.get('/maps/geocode', { params: { address } }),
  reverseGeocode: (lat: number, lng: number) =>
    apiClient.get('/maps/reverse', { params: { lat, lng } }),

  // Users
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data: any) => apiClient.put('/users/profile', data),
  getUserStats: () => apiClient.get('/users/stats'),

  // Chat
  getMessages: (deliveryId: string) => apiClient.get(`/chat/${deliveryId}/messages`),
  sendMessage: (deliveryId: string, message: string) =>
    apiClient.post(`/chat/${deliveryId}/messages`, { message }),
};

export default apiClient;
