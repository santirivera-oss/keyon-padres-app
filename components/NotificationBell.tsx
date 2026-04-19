// ==========================================
// 🔔 COMPONENTE NOTIFICATION BELL
// ==========================================
// Campanita con badge para el header

import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import notificacionesService from '../services/notificaciones';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

interface NotificationBellProps {
  size?: number;
}

export default function NotificationBell({ size = 24 }: NotificationBellProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { sesion, alumno } = useStore();
  
  // Usar alumnoId como identificador del padre
  const padreId = sesion?.alumnoId || alumno?.control;
  
  const [noLeidas, setNoLeidas] = useState(0);
  
  // Animación de shake cuando hay nuevas
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));
  
  // Suscribirse a notificaciones
  useEffect(() => {
    if (!padreId) return;
    
    const unsubscribe = notificacionesService.suscribirseANotificaciones(
      padreId,
      (notificaciones) => {
        const count = notificaciones.filter(n => !n.leida).length;
        
        // Animar si hay nuevas
        if (count > noLeidas && noLeidas > 0) {
          rotation.value = withSequence(
            withTiming(-15, { duration: 100 }),
            withTiming(15, { duration: 100 }),
            withTiming(-10, { duration: 100 }),
            withTiming(10, { duration: 100 }),
            withTiming(0, { duration: 100 })
          );
          scale.value = withSequence(
            withSpring(1.2),
            withSpring(1)
          );
        }
        
        setNoLeidas(count);
      }
    );
    
    return () => unsubscribe();
  }, [padreId]);
  
  const handlePress = () => {
    router.push('/notificaciones');
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <AnimatedView style={animatedStyle}>
        <Feather 
          name="bell" 
          size={size} 
          color={colors.textPrimary} 
        />
      </AnimatedView>
      
      {noLeidas > 0 && (
        <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
          <Text style={styles.badgeText}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});
