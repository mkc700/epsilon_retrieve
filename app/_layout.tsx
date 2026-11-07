import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';
// 1. Importación de TanStack Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 2. Instancia global fuera del ciclo de renderizado
const queryClient = new QueryClient();

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // En web, Esc regresa al menú principal (sin interceptar campos de texto)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = (globalThis as any).window;
    if (Platform.OS !== 'web' || !win || !isAuthenticated) return;
    const onKeyDown = (event: any) => {
      if (event.key !== 'Escape') return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (pathname !== '/menu') router.replace('/menu');
    };
    win.addEventListener('keydown', onKeyDown);
    return () => win.removeEventListener('keydown', onKeyDown);
  }, [isAuthenticated, pathname, router]);

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
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}