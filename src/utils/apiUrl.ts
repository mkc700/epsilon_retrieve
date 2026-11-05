import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Prioridad: EXPO_PUBLIC_API_URL > host del bundler (IP del equipo en el mismo Expo) > defaults por plataforma.
// hostUri tiene la IP del equipo que corre Metro, así funciona en cualquier red sin hardcodear IPs.
const bundlerHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_URL = process.env.EXPO_PUBLIC_API_URL
  || (bundlerHost ? `http://${bundlerHost}:5000/api` : null)
  || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');
