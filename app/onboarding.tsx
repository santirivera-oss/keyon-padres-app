// ==========================================
// ONBOARDING — 3 slides claros · Claude Console
// ==========================================
// Diseño: swipe horizontal + animación cross-fade + slide-up 12px
// Sin gradientes, sin partículas, sin neón.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Theme } from '../constants/Colors';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'keyon_onboarding_completed';

type Slide = {
  icon: keyof typeof Feather.glyphMap;
  titulo: string;
  descripcion: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'user-check',
    titulo: 'Vincula a tu hijo',
    descripcion:
      'Pide tu código de vinculación en la escuela e ingrésalo una sola vez. Listo.',
  },
  {
    icon: 'bell',
    titulo: 'Recibe avisos en tiempo real',
    descripcion:
      'Te notificamos cada vez que tu hijo entra o sale de la escuela, y cuando hay un aviso importante.',
  },
  {
    icon: 'file-text',
    titulo: 'Envía justificantes desde aquí',
    descripcion:
      'Justifica faltas con foto de evidencia. La escuela te responde en tu celular.',
  },
];

const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(style);
};

// ==========================================
// SLIDE — animación de entrada cuando es el activo
// ==========================================
function SlideView({ slide, isActive }: { slide: Slide; isActive: boolean }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    if (isActive) {
      opacity.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = 0;
      translateY.value = 12;
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.slideInner, animStyle]}>
        <View style={styles.iconWrap}>
          <Feather name={slide.icon} size={40} color={Colors.primary} />
        </View>
        <Text style={styles.titulo}>{slide.titulo}</Text>
        <Text style={styles.descripcion}>{slide.descripcion}</Text>
      </Animated.View>
    </View>
  );
}

// ==========================================
// PANTALLA
// ==========================================
export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  // Fade-in inicial del header/footer
  const chromeOpacity = useSharedValue(0);

  useEffect(() => {
    chromeOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
  }, []);

  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.value }));

  const scrollTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
    triggerHaptic();
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      scrollTo(index + 1);
    } else {
      finalizarOnboarding();
    }
  };

  const handleSkip = () => {
    triggerHaptic();
    finalizarOnboarding();
  };

  const finalizarOnboarding = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {}
    router.replace('/login');
  };

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    if (newIndex !== index) setIndex(newIndex);
  };

  const esUltima = index === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />

      {/* Header: brand + skip */}
      <Animated.View style={[styles.header, chromeStyle]}>
        <View style={styles.brand}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>KEYON</Text>
        </View>

        {!esUltima && (
          <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {SLIDES.map((s, i) => (
          <SlideView key={i} slide={s} isActive={i === index} />
        ))}
      </ScrollView>

      {/* Footer: dots + CTA */}
      <Animated.View style={[styles.footer, chromeStyle]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.cta}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {esUltima ? 'Comenzar' : 'Siguiente'}
          </Text>
          <Feather
            name={esUltima ? 'check' : 'arrow-right'}
            size={18}
            color="#ffffff"
          />
        </TouchableOpacity>

        <Text style={styles.footerBrand}>por Exara Studio</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Scroll
  scroll: {
    flex: 1,
  },

  // Slide
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  slideInner: {
    alignItems: 'center',
    maxWidth: 360,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 32,
  },
  descripcion: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerBrand: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});

// Export compat
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}
