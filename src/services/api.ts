import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Usar IP de la red local para Android, localhost para web/iOS simulator
const API_URL = Platform.OS === 'android' 
  ? 'http://192.168.0.157:5000/api' 
  : (Platform.OS === 'web' ? 'http://localhost:5000/api' : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api'));

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const notesAPI = {
  getNotes: async () => {
    const response = await api.get('/notes');
    return response.data;
  },

  createNote: async (title: string, content: string) => {
    const response = await api.post('/notes', { title, content });
    return response.data;
  },

  updateNote: async (id: string, title: string, content: string) => {
    const response = await api.put(`/notes/${id}`, { title, content });
    return response.data;
  },

  deleteNote: async (id: string) => {
    const response = await api.delete(`/notes/${id}`);
    return response.data;
  },
};

export default api;
