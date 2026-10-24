import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="signup" options={{ title: 'Signup' }} />
        <Stack.Screen name="menu" options={{ title: 'Menu' }} />
        <Stack.Screen name="notes" options={{ title: 'Notas' }} />
        <Stack.Screen name="agenda" options={{ title: 'Agenda' }} />
        <Stack.Screen name="todos" options={{ title: 'Tareas' }} />
      </Stack>
    </AuthProvider>
  );
}
