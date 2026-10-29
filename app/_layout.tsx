import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
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
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

