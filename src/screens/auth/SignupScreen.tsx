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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { CustomModal } from '../../components/CustomModal';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signup, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const handleSignup = async () => {
    if (!username || !email || !password || !confirmPassword) {
      showModal('Error', 'Por favor completa todos los campos', 'error');
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Error', 'Por favor ingresa un correo electrónico válido', 'error');
      return;
    }
    
    if (password.length < 8) {
      showModal('Error', 'La contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showModal('Error', 'Las contraseñas no coinciden', 'error');
      return;
    }
    try {
      await signup(username, email, password);
      showModal('¡Bienvenido!', `Hola ${username}, tu cuenta ha sido creada exitosamente`, 'success');
      setTimeout(() => {
        router.replace('/menu');
      }, 1500);
    } catch (error: any) {
      showModal('Error', error.message || 'No se pudo crear la cuenta', 'error');
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
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Crear cuenta</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Nombre de usuario"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                accessible={true}
                accessibilityLabel="Nombre de usuario"
              />
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
                placeholder="Contraseña (mínimo 8 caracteres)"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                accessible={true}
                accessibilityLabel="Contraseña"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                accessible={true}
                accessibilityLabel="Confirmar contraseña"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, loading && { backgroundColor: colors.disabled }]}
              onPress={handleSignup}
              disabled={loading}
              accessible={true}
              accessibilityLabel="Crear cuenta"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Cargando...' : 'Crear Cuenta'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/login')} accessible={true} accessibilityLabel="Iniciar sesión" accessibilityRole="link">
              <Text style={[styles.linkText, { color: colors.primary }]}>¿Ya tienes cuenta? Inicia sesión</Text>
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
});
