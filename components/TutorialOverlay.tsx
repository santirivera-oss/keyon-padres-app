// ==========================================
// 🎓 TUTORIAL OVERLAY - SIMPLIFICADO
// ==========================================
// Solo: Card informativo + borde highlight
// Compatible con Android e iOS

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';

const { width, height } = Dimensions.get('window');

const TUTORIAL_KEY = 'keyon_tutorial_v9_completed';
const CONTACT_NUMBER = '+52 493 188 7739';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  route?: string;
  highlightArea?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Keyon!',
    description: 'Te mostraré las funciones principales de la app.',
    icon: 'zap',
    route: '/(tabs)/inicio',
  },
  {
    id: 'estado',
    title: 'Estado en tiempo real',
    description: 'Esta tarjeta muestra si tu hijo está dentro o fuera del plantel.',
    icon: 'activity',
    route: '/(tabs)/inicio',
    highlightArea: { top: 90, left: 12, width: width - 24, height: 140 },
  },
  {
    id: 'actividad',
    title: 'Actividad del día',
    description: 'Aquí aparecen todas las entradas y salidas con hora exacta.',
    icon: 'clock',
    route: '/(tabs)/inicio',
    highlightArea: { top: 245, left: 12, width: width - 24, height: 180 },
  },
  {
    id: 'asistencia',
    title: 'Calendario de asistencia',
    description: 'Historial completo de asistencias. Verde = presente, Rojo = falta.',
    icon: 'calendar',
    route: '/(tabs)/asistencia',
    highlightArea: { top: 100, left: 12, width: width - 24, height: 300 },
  },
  {
    id: 'avisos',
    title: 'Avisos escolares',
    description: 'Comunicados importantes de la escuela y profesores.',
    icon: 'bell',
    route: '/(tabs)/avisos',
    highlightArea: { top: 120, left: 12, width: width - 24, height: 200 },
  },
  {
    id: 'estadisticas',
    title: 'Estadísticas',
    description: 'Gráficas de asistencia, retardos y faltas de tu hijo.',
    icon: 'bar-chart-2',
    route: '/(tabs)/estadisticas',
    highlightArea: { top: 100, left: 12, width: width - 24, height: 250 },
  },
  {
    id: 'perfil',
    title: 'Perfil y herramientas',
    description: 'Exporta PDFs, envía justificantes y configura la app.',
    icon: 'user',
    route: '/(tabs)/perfil',
    highlightArea: { top: 180, left: 12, width: width - 24, height: 280 },
  },
  {
    id: 'final',
    title: '¡Todo listo!',
    description: 'Ya conoces las funciones principales de Keyon.',
    icon: 'check-circle',
    route: '/(tabs)/inicio',
  },
];

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);
  
  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const totalSteps = TUTORIAL_STEPS.length;

  // Animaciones
  const borderScale = useSharedValue(1);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(20);

  useEffect(() => {
    // Navegar a la ruta del paso
    if (step.route && pathname !== step.route) {
      router.push(step.route as any);
    }

    // Reset animaciones
    cardOpacity.value = 0;
    cardTranslateY.value = 20;

    // Animación del borde
    borderScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Entrada del card
    setTimeout(() => {
      cardOpacity.value = withTiming(1, { duration: 200 });
      cardTranslateY.value = withSpring(0, { damping: 15 });
    }, 200);
  }, [currentStep]);

  const borderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: borderScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const goNext = () => {
    triggerHaptic();
    if (isLastStep) {
      completeTutorial();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    triggerHaptic();
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    triggerHaptic();
    completeTutorial();
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    } catch (error) {
      console.log('Error saving tutorial:', error);
    }
    router.push('/(tabs)/inicio');
    setVisible(false);
    onComplete();
  };

  const handleContact = () => {
    triggerHaptic();
    Linking.openURL(`https://wa.me/524931887739`);
  };

  if (!visible) return null;

  // Calcular posición del card
  const getCardStyle = () => {
    if (!step.highlightArea) {
      // Centrado para welcome y final
      return { top: height * 0.35 };
    }
    // Debajo del highlight
    const cardTop = step.highlightArea.top + step.highlightArea.height + 16;
    if (cardTop > height - 250) {
      // Si no cabe abajo, ponerlo arriba
      return { top: step.highlightArea.top - 180 };
    }
    return { top: cardTop };
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        {/* Fondo semi-transparente */}
        <View style={styles.backdrop} />

        {/* Borde highlight */}
        {step.highlightArea && (
          <Animated.View
            style={[
              styles.highlightBorder,
              borderStyle,
              {
                top: step.highlightArea.top,
                left: step.highlightArea.left,
                width: step.highlightArea.width,
                height: step.highlightArea.height,
              },
            ]}
          />
        )}

        {/* Card informativo */}
        <Animated.View style={[styles.cardWrapper, getCardStyle(), cardStyle]}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Feather name={step.icon as any} size={20} color="#0284c7" />
              </View>
              <Text style={styles.stepCounter}>{currentStep + 1} / {totalSteps}</Text>
            </View>

            {/* Contenido */}
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            {/* Pantalla final: soporte */}
            {isLastStep && (
              <View style={styles.supportBox}>
                <Text style={styles.supportText}>¿Encontraste algún error?</Text>
                <TouchableOpacity style={styles.whatsappBtn} onPress={handleContact}>
                  <Feather name="message-circle" size={16} color="white" />
                  <Text style={styles.whatsappText}>{CONTACT_NUMBER}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botones */}
            <View style={styles.buttons}>
              {isFirstStep ? (
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Omitir</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                  <Feather name="chevron-left" size={18} color="#64748b" />
                  <Text style={styles.backText}>Atrás</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={goNext} style={styles.nextBtn}>
                <Text style={styles.nextText}>
                  {isLastStep ? 'Finalizar' : isFirstStep ? 'Comenzar' : 'Siguiente'}
                </Text>
                <Feather name={isLastStep ? 'check' : 'chevron-right'} size={18} color="white" />
              </TouchableOpacity>
            </View>

            {/* Branding */}
            <Text style={styles.branding}>Exara Studio</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Funciones auxiliares
export async function shouldShowTutorial(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(TUTORIAL_KEY);
    return completed !== 'true';
  } catch {
    return true;
  }
}

export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_KEY);
  } catch (error) {
    console.log('Error resetting tutorial:', error);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  
  // Highlight - solo borde, interior transparente
  highlightBorder: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#0ea5e9',
    backgroundColor: 'transparent',
  },
  
  // Card
  cardWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounter: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  
  // Soporte (pantalla final)
  supportBox: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  supportText: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#128C7E',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  whatsappText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Botones
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  skipText: {
    color: '#64748b',
    fontSize: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  backText: {
    color: '#64748b',
    fontSize: 14,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  nextText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Branding
  branding: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 10,
    marginTop: 12,
  },
});
