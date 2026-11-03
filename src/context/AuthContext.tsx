import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/index';
import { authAPI } from '../services/api';
import { syncService } from '../services/syncService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authAPI.login(email, password);
      
      // Guardar token
      await AsyncStorage.setItem('token', response.token);
      
      // Guardar usuario
      setUser(response.user);
      
      // Guardar en Dexie para offline
      await syncService.saveUserOffline(response.user);
      await syncService.markUserSynced(response.user.id);
      
      // Limpiar acciones pendientes inválidas
      await syncService.cleanupInvalidPendingActions();
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || !error.response) {
        await syncService.addPendingAction('login', { email, password });
        throw new Error('Sin conexión. Datos guardados para sincronizar cuando haya conexión.');
      }
      
      let errorMessage = 'Error al iniciar sesión';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('Error message from backend:', errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authAPI.register(username, email, password);
      
      // Guardar token
      await AsyncStorage.setItem('token', response.token);
      
      // Guardar usuario
      setUser(response.user);
      
      // Guardar en Dexie para offline
      await syncService.saveUserOffline(response.user);
      await syncService.markUserSynced(response.user.id);
    } catch (error: any) {
      console.error('Signup error:', error);
      // Si falla por conexión, guardar como acción pendiente
      if (error.code === 'ECONNREFUSED' || !error.response) {
        await syncService.addPendingAction('register', { username, email, password });
        throw new Error('Sin conexión. Registro guardado para sincronizar cuando haya conexión.');
      }
      throw new Error(error.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem('token');
      await syncService.clearLocalData();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check for existing token on app startup
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Try to get user from API
          try {
            const response = await authAPI.getMe();
            setUser(response.user);
            await syncService.saveUserOffline(response.user);
            await syncService.markUserSynced(response.user.id);
          } catch (apiError) {
            // If API fails, try to load from offline storage
            console.log('API unavailable, loading from offline storage');
            const offlineUser = await syncService.getUserOffline();
            if (offlineUser) {
              setUser({
                id: offlineUser.userId,
                username: offlineUser.username,
                email: offlineUser.email,
                createdAt: offlineUser.createdAt,
              });
            } else {
              await AsyncStorage.removeItem('token');
            }
          }
        }
      } catch (error) {
        console.error('Token validation error:', error);
        try {
          await AsyncStorage.removeItem('token');
        } catch (e) {
          console.error('Error removing token:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    // Timeout para asegurar que siempre se inicialice
    const timeoutId = setTimeout(() => {
      console.log('Auth initialization timeout, forcing initialization');
      setLoading(false);
    }, 2000);

    loadToken();

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
