import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// Paleta de colores roja
const COLORS = {
  redLight: '#f5e4e4',
  redMedium: '#a12624',
  redDark: '#4a100f',
};

interface Theme {
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceSecondary: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
    primaryLight: string;
    primaryDark: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    // Accesibilidad iOS
    focusRing: string;
    disabled: string;
  };
  toggleTheme: () => void;
}

const lightTheme: Theme['colors'] = {
  background: '#ffffff',
  surface: '#f8f9fa',
  surfaceSecondary: '#f1f3f4',
  text: '#1a1a1a',
  textSecondary: '#5f6368',
  textTertiary: '#9aa0a6',
  primary: COLORS.redMedium,
  primaryLight: COLORS.redLight,
  primaryDark: COLORS.redDark,
  border: '#e0e0e0',
  error: '#dc3545',
  success: '#28a745',
  warning: '#ffc107',
  focusRing: COLORS.redMedium,
  disabled: '#c4c4c4',
};

const darkTheme: Theme['colors'] = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceSecondary: '#2d2d2d',
  text: '#e8e8e8',
  textSecondary: '#a0a0a0',
  textTertiary: '#6b6b6b',
  primary: COLORS.redMedium,
  primaryLight: COLORS.redDark,
  primaryDark: COLORS.redLight,
  border: '#3d3d3d',
  error: '#ff6b6b',
  success: '#4ade80',
  warning: '#fbbf24',
  focusRing: COLORS.redMedium,
  disabled: '#4a4a4a',
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      } else {
        // Usar preferencia del sistema si no hay guardada
        setIsDark(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme: Theme = {
    isDark,
    colors: isDark ? darkTheme : lightTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
