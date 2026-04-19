// ==========================================
// 🔒 PANTALLA DE BLOQUEO - Biometría
// ==========================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import biometricService, { BiometricType } from '../services/biometric';

interface LockScreenProps {
  onUnlock: () => void;
  biometricType: BiometricType;
}

export default function LockScreen({ onUnlock, biometricType }: LockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animaciones
  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.3);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    // Animación de pulso continuo
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinito
      true
    );

    // Auto-autenticar al montar
    handleAuthenticate();
  }, []);

  const triggerHaptic = (type: 'success' | 'error' | 'light' = 'light') => {
    if (Platform.OS === 'web') return;
    
    if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleAuthenticate = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);
    triggerHaptic('light');

    // Animación del icono
    iconScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );

    const result = await biometricService.authenticate('Desbloquea Keyon Padres');

    if (result.success) {
      triggerHaptic('success');
      
      // Animación de éxito
      iconRotate.value = withSequence(
        withTiming(360, { duration: 500 }),
        withTiming(0, { duration: 0 })
      );
      iconScale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );

      // Pequeño delay para ver la animación
      setTimeout(() => {
        onUnlock();
      }, 300);
    } else {
      triggerHaptic('error');
      setError(result.error || 'No se pudo autenticar');
      
      // Animación de error (shake)
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }

    setIsAuthenticating(false);
  };

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: 1 + pulseOpacity.value * 0.3 }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const biometricName = biometricService.getBiometricName(biometricType);
  const biometricIcon = biometricService.getBiometricIcon(biometricType);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.pulse, pulseAnimatedStyle]} />
          <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
            <Feather name="shield" size={40} color="#d97757" />
          </Animated.View>
        </View>

        <Text style={styles.title}>Keyon Padres</Text>
        <Text style={styles.subtitle}>Toca para desbloquear</Text>

        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleAuthenticate}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          <View style={styles.biometricContent}>
            {isAuthenticating ? (
              <ActivityIndicator color="#d97757" size="small" />
            ) : (
              <Feather name={biometricIcon as any} size={22} color="#d97757" />
            )}
            <Text style={styles.biometricText}>
              {isAuthenticating ? 'Autenticando...' : `Usar ${biometricName}`}
            </Text>
          </View>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.hint}>Tu información está protegida</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#191919',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(217, 119, 87, 0.12)',
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: '#262624',
    borderWidth: 1,
    borderColor: '#3a3a38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f5f4ed',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#b4b2a7',
    marginBottom: 40,
  },
  biometricButton: {
    backgroundColor: '#262624',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#3a3a38',
    marginBottom: 16,
  },
  biometricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d97757',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  hint: {
    position: 'absolute',
    bottom: -80,
    fontSize: 12,
    color: '#7a7870',
  },
});
