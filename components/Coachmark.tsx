// ==========================================
// 💡 COMPONENTE COACHMARK
// ==========================================
// Tooltip iluminado para el tutorial interactivo

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTutorial, TutorialStep } from '../context/TutorialContext';

const { width, height } = Dimensions.get('window');

interface CoachmarkProps {
  step: TutorialStep;
  targetLayout?: { x: number; y: number; width: number; height: number };
}

export default function Coachmark({ step, targetLayout }: CoachmarkProps) {
  const { nextStep, skipTutorial, currentStep, totalSteps, prevStep } = useTutorial();
  
  // Animaciones
  const pulseScale = useSharedValue(1);
  const tooltipOpacity = useSharedValue(0);
  const tooltipTranslateY = useSharedValue(20);

  useEffect(() => {
    // Animación de pulso para el spotlight
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Entrada del tooltip
    tooltipOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    tooltipTranslateY.value = withDelay(200, withSpring(0, { damping: 15 }));
  }, [step.id]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [{ translateY: tooltipTranslateY.value }],
  }));

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    triggerHaptic();
    nextStep();
  };

  const handleSkip = () => {
    triggerHaptic();
    skipTutorial();
  };

  const handlePrev = () => {
    triggerHaptic();
    prevStep();
  };

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  // Posición del tooltip basada en targetLayout
  const getTooltipPosition = () => {
    if (!targetLayout) {
      return {
        top: height * 0.35,
        left: 20,
        right: 20,
      };
    }

    const tooltipHeight = 200;
    const padding = 20;

    if (step.position === 'top') {
      return {
        bottom: height - targetLayout.y + padding,
        left: padding,
        right: padding,
      };
    } else {
      return {
        top: targetLayout.y + targetLayout.height + padding,
        left: padding,
        right: padding,
      };
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay}>
        {/* Fondo oscuro semi-transparente */}
        <View style={styles.backdrop} />

        {/* Spotlight (área iluminada) */}
        {targetLayout && (
          <Animated.View
            style={[
              styles.spotlight,
              pulseStyle,
              {
                top: targetLayout.y - 10,
                left: targetLayout.x - 10,
                width: targetLayout.width + 20,
                height: targetLayout.height + 20,
              },
            ]}
          />
        )}

        {/* Tooltip / Card de información */}
        <Animated.View style={[styles.tooltipContainer, tooltipPosition, tooltipStyle]}>
          <View style={styles.tooltipCard}>
            {/* Header con icono */}
            <View style={styles.tooltipHeader}>
              <View style={styles.iconContainer}>
                <View style={styles.iconGradient}>
                  <Feather name={step.icon as any || 'info'} size={22} color="#d97757" />
                </View>
              </View>
              
              {/* Indicador de paso */}
              <View style={styles.stepIndicator}>
                <Text style={styles.stepText}>{currentStep + 1} / {totalSteps}</Text>
              </View>
            </View>

            {/* Título */}
            <Text style={styles.tooltipTitle}>{step.title}</Text>

            {/* Descripción */}
            <Text style={styles.tooltipDescription}>{step.description}</Text>

            {/* Indicadores de progreso */}
            <View style={styles.progressDots}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentStep && styles.dotActive,
                    index < currentStep && styles.dotCompleted,
                  ]}
                />
              ))}
            </View>

            {/* Botones */}
            <View style={styles.buttonsContainer}>
              {!isFirstStep ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrev}>
                  <Feather name="chevron-left" size={18} color="#94a3b8" />
                  <Text style={styles.secondaryBtnText}>Anterior</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip}>
                  <Text style={styles.secondaryBtnText}>Omitir</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <View
                  style={[
                    styles.primaryBtnGradient,
                    { backgroundColor: isLastStep ? '#22c55e' : '#d97757' },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {isLastStep ? '¡Empezar!' : 'Siguiente'}
                  </Text>
                  <Feather
                    name={isLastStep ? 'check' : 'chevron-right'}
                    size={18}
                    color="white"
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Branding */}
            <View style={styles.branding}>
              <Text style={styles.brandingText}>Powered by</Text>
              <Text style={styles.brandingLogo}>KEYON</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ==========================================
// 🎨 COMPONENTE WELCOME SCREEN
// ==========================================

export function WelcomeCoachmark() {
  const { nextStep, skipTutorial } = useTutorial();
  
  const logoScale = useSharedValue(0);
  const logoRotate = useSharedValue(-10);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    // Animación de entrada del logo
    logoScale.value = withDelay(100, withSpring(1, { damping: 12 }));
    logoRotate.value = withDelay(100, withSpring(0, { damping: 15 }));
    
    // Texto
    textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    
    // Botones
    buttonOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.welcomeContainer}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoBg}>
            <Feather name="shield" size={44} color="#d97757" />
          </View>
          <Text style={styles.logoText}>KEYON</Text>
          <Text style={styles.logoSubtext}>Access System</Text>
        </Animated.View>

        {/* Bienvenida */}
        <Animated.View style={[styles.welcomeTextContainer, textStyle]}>
          <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
          <Text style={styles.welcomeSubtitle}>
            Sigue a tu hijo en la escuela, en tiempo real.
          </Text>
        </Animated.View>

        {/* Features preview */}
        <Animated.View style={[styles.featuresContainer, textStyle]}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Feather name="activity" size={18} color="#d97757" />
            </View>
            <Text style={styles.featureText}>Tiempo real</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Feather name="bell" size={18} color="#d97757" />
            </View>
            <Text style={styles.featureText}>Alertas</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Feather name="file-text" size={18} color="#d97757" />
            </View>
            <Text style={styles.featureText}>Reportes</Text>
          </View>
        </Animated.View>

        {/* Botones */}
        <Animated.View style={[styles.welcomeButtons, buttonStyle]}>
          <TouchableOpacity
            style={styles.welcomePrimaryBtn}
            onPress={() => {
              triggerHaptic();
              nextStep();
            }}
          >
            <View style={styles.welcomePrimaryGradient}>
              <Text style={styles.welcomePrimaryText}>Iniciar tour</Text>
              <Feather name="arrow-right" size={18} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.welcomeSecondaryBtn}
            onPress={() => {
              triggerHaptic();
              skipTutorial();
            }}
          >
            <Text style={styles.welcomeSecondaryText}>Saltar introducción</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <View style={styles.welcomeFooter}>
          <Text style={styles.footerText}>Desarrollado para CBTis No. 011</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  
  // Spotlight
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Tooltip
  tooltipContainer: {
    position: 'absolute',
    zIndex: 100,
  },
  tooltipCard: {
    backgroundColor: '#262624',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3a3a38',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {},
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1f1e1d',
    borderWidth: 1,
    borderColor: '#3a3a38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    backgroundColor: '#1f1e1d',
    borderWidth: 1,
    borderColor: '#3a3a38',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: {
    color: '#b4b2a7',
    fontSize: 11,
    fontWeight: '600',
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f5f4ed',
    marginBottom: 6,
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#b4b2a7',
    lineHeight: 21,
    marginBottom: 16,
  },

  // Progress dots
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3a3a38',
  },
  dotActive: {
    backgroundColor: '#d97757',
    width: 20,
  },
  dotCompleted: {
    backgroundColor: '#22c55e',
  },

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    color: '#b4b2a7',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Branding
  branding: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a38',
  },
  brandingText: {
    color: '#7a7870',
    fontSize: 10,
  },
  brandingLogo: {
    color: '#d97757',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Welcome screen
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#191919',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBg: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#262624',
    borderWidth: 1,
    borderColor: '#3a3a38',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f4ed',
    letterSpacing: 3,
  },
  logoSubtext: {
    fontSize: 12,
    color: '#7a7870',
    letterSpacing: 2,
    marginTop: 4,
  },
  welcomeTextContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f4ed',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#b4b2a7',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 44,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#262624',
    borderWidth: 1,
    borderColor: '#3a3a38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: '#b4b2a7',
    fontSize: 12,
    fontWeight: '500',
  },
  welcomeButtons: {
    width: '100%',
    gap: 12,
  },
  welcomePrimaryBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#d97757',
  },
  welcomePrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  welcomePrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeSecondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  welcomeSecondaryText: {
    color: '#b4b2a7',
    fontSize: 14,
  },
  welcomeFooter: {
    position: 'absolute',
    bottom: 32,
  },
  footerText: {
    color: '#7a7870',
    fontSize: 11,
  },
});
