import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { CustomModal } from '../../components/CustomModal';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  
  const modalRef = useRef<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [modalVisible, setModalVisible] = useState(false);
  const authErrorRef = useRef('');
  const [showAuthError, setShowAuthError] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  console.log('Render - authError:', authErrorRef.current, 'showAuthError:', showAuthError);

  useEffect(() => {
    console.log('useEffect - showAuthError:', showAuthError, 'authErrorRef.current:', authErrorRef.current);
  }, [showAuthError, forceUpdate]);

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    modalRef.current = {
      visible: true,
      title,
      message,
      type
    };
    setModalVisible(true);
  };

  const handleLogin = async () => {
    authErrorRef.current = '';
    setShowAuthError(false);
    if (!email || !password) {
      showModal('Error', 'Por favor completa todos los campos', 'error');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Error', 'Por favor ingresa un correo electrónico válido', 'error');
      return;
    }
    
    // Prueba: mostrar texto de error siempre
    authErrorRef.current = 'Usuario no encontrado';
    setTimeout(() => {
      setShowAuthError(true);
      setForceUpdate(prev => prev + 1);
    }, 100);
    
    try {
      await login(email, password);
      showModal('¡Bienvenido de nuevo!', 'Has iniciado sesión exitosamente', 'success');
      setTimeout(() => {
        router.replace('/menu');
      }, 1500);
    } catch (error: any) {
      let errorMessage = error.message || 'No se pudo iniciar sesión';
      console.log('Error message in LoginScreen:', errorMessage);
      
      if (errorMessage.includes('User not found') || errorMessage.includes('usuario no encontrado') || errorMessage.includes('no existe')) {
        errorMessage = 'El usuario no existe. Por favor verifica tu correo electrónico.';
      } else if (errorMessage.includes('Invalid credentials') || errorMessage.includes('credenciales') || errorMessage.includes('contraseña incorrecta')) {
        authErrorRef.current = errorMessage;
        setShowAuthError(true);
        setForceUpdate(prev => prev + 1);
        console.log('Setting authError:', errorMessage);
        return;
      } else if (errorMessage.includes('Sin conexión')) {
        errorMessage = 'Sin conexión al servidor. Verifica tu conexión a internet.';
      }
      
      showModal('Error', errorMessage, 'error');
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.primary }]}>Epsilon Retrieve</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Inicia sesión</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                accessible={true}
                accessibilityLabel="Correo electrónico"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Contraseña"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
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
              <Text style={styles.buttonText}>
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
              </Text>
            </TouchableOpacity>

            {showAuthError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{authErrorRef.current}</Text>
            ) : null}

            <TouchableOpacity onPress={() => router.push('/signup')} accessible={true} accessibilityLabel="Registrarse" accessibilityRole="link">
              <Text style={[styles.linkText, { color: colors.primary }]}>¿No tienes cuenta? Regístrate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomModal
        visible={modalVisible}
        title={modalRef.current.title}
        message={modalRef.current.message}
        type={modalRef.current.type}
        onClose={() => {
          setModalVisible(false);
          modalRef.current = { visible: false, title: '', message: '', type: 'info' };
        }}
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
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
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
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
    marginTop: 12,
    fontWeight: '500',
  },
});
