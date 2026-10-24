import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    // TODO: Implementar autenticación real con backend
    // Por ahora es un mock
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser({
      id: '1',
      email,
      name: 'Usuario Demo',
      createdAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true);
    // TODO: Implementar registro real con backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser({
      id: '1',
      email,
      name,
      createdAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    // TODO: Implementar logout real
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    setLoading(false);
  };

  // Simular inicialización
  React.useEffect(() => {
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return null; // No renderizar hasta inicializar
  }

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
