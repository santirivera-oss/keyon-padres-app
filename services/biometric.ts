// ==========================================
// 🔐 SERVICIO DE BIOMETRÍA
// ==========================================
// Face ID, Touch ID, Huella digital

import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'keyon_biometric_enabled';
const BIOMETRIC_ASKED_KEY = 'keyon_biometric_asked';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

interface BiometricStatus {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
}

class BiometricService {
  
  // ==========================================
  // 📱 VERIFICAR DISPONIBILIDAD
  // ==========================================
  
  async checkBiometricSupport(): Promise<BiometricStatus> {
    // En web no hay biometría
    if (Platform.OS === 'web') {
      console.log('🔐 Biometría: Web platform - no disponible');
      return {
        isAvailable: false,
        biometricType: 'none',
        isEnrolled: false,
      };
    }

    try {
      // Verificar si el hardware soporta biometría
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      console.log('🔐 Biometría hasHardware:', hasHardware);
      
      if (!hasHardware) {
        return {
          isAvailable: false,
          biometricType: 'none',
          isEnrolled: false,
        };
      }

      // Verificar si hay biométricos registrados
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('🔐 Biometría isEnrolled:', isEnrolled);
      
      if (!isEnrolled) {
        return {
          isAvailable: false,
          biometricType: 'none',
          isEnrolled: false,
        };
      }

      // Obtener tipos de autenticación disponibles
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('🔐 Biometría supportedTypes:', supportedTypes);
      
      let biometricType: BiometricType = 'fingerprint';
      
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'facial';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }

      return {
        isAvailable: true,
        biometricType,
        isEnrolled: true,
      };
    } catch (error) {
      console.log('🔐 Error checking biometric support:', error);
      return {
        isAvailable: false,
        biometricType: 'none',
        isEnrolled: false,
      };
    }
  }

  // ==========================================
  // 🔓 AUTENTICAR
  // ==========================================
  
  async authenticate(reason?: string): Promise<{ success: boolean; error?: string }> {
    // En web siempre retorna éxito
    if (Platform.OS === 'web') {
      return { success: true };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Desbloquea Keyon',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false, // Permite PIN/contraseña como fallback
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        return { success: true };
      }

      // Manejar diferentes errores
      switch (result.error) {
        case 'user_cancel':
          return { success: false, error: 'Autenticación cancelada' };
        case 'user_fallback':
          return { success: false, error: 'Usar contraseña del dispositivo' };
        case 'system_cancel':
          return { success: false, error: 'Sistema canceló la autenticación' };
        case 'lockout':
          return { success: false, error: 'Demasiados intentos. Intenta más tarde.' };
        default:
          return { success: false, error: 'Error de autenticación' };
      }
    } catch (error) {
      console.log('Biometric authentication error:', error);
      return { success: false, error: 'Error al autenticar' };
    }
  }

  // ==========================================
  // ⚙️ PREFERENCIAS
  // ==========================================
  
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.log('Error saving biometric preference:', error);
    }
  }

  async hasAskedForBiometric(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ASKED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  async setAskedForBiometric(): Promise<void> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ASKED_KEY, 'true');
    } catch (error) {
      console.log('Error saving biometric asked flag:', error);
    }
  }

  // ==========================================
  // 🏷️ HELPERS
  // ==========================================
  
  getBiometricName(type: BiometricType): string {
    switch (type) {
      case 'facial':
        return Platform.OS === 'ios' ? 'Face ID' : 'Reconocimiento facial';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Huella digital';
      case 'iris':
        return 'Reconocimiento de iris';
      default:
        return 'Biometría';
    }
  }

  getBiometricIcon(type: BiometricType): string {
    switch (type) {
      case 'facial':
        return 'smile'; // Feather icon
      case 'fingerprint':
        return 'smartphone';
      default:
        return 'lock';
    }
  }
}

export default new BiometricService();
