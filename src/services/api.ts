import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/apiUrl';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token && !config.headers.Authorization) {
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

  getMe: async (token?: string) => {
    const response = await api.get('/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
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

// Each sync captures its token so switching accounts cannot reassign in-flight events.
export const agendaAPI = {
  list: async (token: string) => {
    const response = await api.get('/agenda', { params: { includeDeleted: true }, headers: { Authorization: `Bearer ${token}` } });
    return response.data;
  },
  put: async (id: string, fields: { title: string; description: string; date: string; time: string }, token: string) => {
    const response = await api.put(`/agenda/${encodeURIComponent(id)}`, fields, { headers: { Authorization: `Bearer ${token}` } });
    return response.data;
  },
  remove: async (id: string, token: string) => {
    await api.delete(`/agenda/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
  },
};
