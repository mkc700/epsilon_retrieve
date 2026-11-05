import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
// 1. Importación de TanStack Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 2. Instancia global fuera del ciclo de renderizado
const queryClient = new QueryClient();

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/menu');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="signup" options={{ title: 'Signup' }} />
      <Stack.Screen name="menu" options={{ title: 'Menu' }} />
      <Stack.Screen name="notes" options={{ title: 'Notas' }} />
      <Stack.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Stack.Screen name="todos" options={{ title: 'Tareas' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    // 3. Envoltorio general con QueryClientProvider
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}