import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { CustomModal } from '../../components/CustomModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [authError, setAuthError] = useState('');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const handleLogin = async () => {
    setAuthError('');

    if (!email || !password) {
      showModal('Error', 'Por favor completa todos los campos', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Error', 'Por favor ingresa un correo electrónico válido', 'error');
      return;
    }

    try {
      await login(email, password);
      showModal('¡Bienvenido de nuevo!', 'Has iniciado sesión exitosamente', 'success');
      setTimeout(() => {
        router.replace('/menu');
      }, 1500);
    } catch (error: any) {
      const rawMessage = error?.message || 'No se pudo iniciar sesión';

      if (
        rawMessage.includes('Invalid credentials') ||
        rawMessage.includes('credenciales') ||
        rawMessage.includes('contraseña incorrecta')
      ) {
        setAuthError('El correo o la contraseña son incorrectos.');
        return;
      }

      if (
        rawMessage.includes('User not found') ||
        rawMessage.includes('usuario no encontrado') ||
        rawMessage.includes('no existe')
      ) {
        showModal('Error', 'El usuario no existe. Por favor verifica tu correo electrónico.', 'error');
        return;
      }

      if (rawMessage.includes('Sin conexión')) {
        showModal('Error', 'Sin conexión al servidor. Verifica tu conexión a internet.', 'error');
        return;
      }

      showModal('Error', rawMessage, 'error');
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.titleBlock}>
              <Image
                source={isDark ? require('../../../assets/LOGO_EPSILON_N.png') : require('../../../assets/LOGO_EPSILON_B.png')}
                style={styles.authLogo}
                resizeMode="contain"
              />
              <Text style={[styles.title, { color: colors.primary }]}>Epsilon</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Inicia sesión</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  setAuthError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                accessible={true}
                accessibilityLabel="Correo electrónico"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Contraseña"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setAuthError('');
                }}
                secureTextEntry
                autoComplete="password"
                accessible={true}
                accessibilityLabel="Contraseña"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, loading && { backgroundColor: colors.disabled }]}
              onPress={handleLogin}
              disabled={loading}
              accessible={true}
              accessibilityLabel="Iniciar sesión"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
              </Text>
            </TouchableOpacity>

            {authError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{authError}</Text>
            ) : null}

            <TouchableOpacity
              onPress={() => router.push('/signup')}
              accessible={true}
              accessibilityLabel="Registrarse"
              accessibilityRole="link"
            >
              <Text style={[styles.linkText, { color: colors.primary }]}>¿No tienes cuenta? Regístrate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 12,
  },
  authLogo: {
    width: 56,
    height: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    minHeight: 52,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 12,
  },
});
