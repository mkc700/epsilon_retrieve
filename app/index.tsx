import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../src/context/ThemeContext';

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    // Redirigir al login
    router.replace('/login');
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
