// ==========================================
// 📱 KEYON PADRES - LAYOUT PRINCIPAL
// ==========================================
// Con soporte para biometría y onboarding

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeFirebase } from '../services/firebase';
import { useStore } from '../store/useStore';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import biometricService, { BiometricType } from '../services/biometric';
import LockScreen from '../components/LockScreen';

SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = 'keyon_onboarding_completed';

// Componente interno que usa el tema
function RootLayoutContent() {
  const { isLoading, isAuthenticated, inicializar } = useStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [appReady, setAppReady] = useState(false);
  
  // Estados de biometría
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricChecked, setBiometricChecked] = useState(false);
  
  // Estado de onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Inicialización
  useEffect(() => {
    async function init() {
      try {
        console.log('🚀 Layout: Inicializando...');
        initializeFirebase();
        await inicializar();
        
        // Verificar biometría
        if (Platform.OS !== 'web') {
          const status = await biometricService.checkBiometricSupport();
          const isEnabled = await biometricService.isBiometricEnabled();
          
          console.log('🔐 Biometría disponible:', status.isAvailable);
          console.log('🔐 Biometría tipo:', status.biometricType);
          console.log('🔐 Biometría enrolled:', status.isEnrolled);
          console.log('🔐 Biometría enabled:', isEnabled);
          
          if (status.isAvailable && isEnabled) {
            setBiometricType(status.biometricType);
            setIsLocked(true);
          }
        }
        
        setBiometricChecked(true);
        
        // NOTA: onboarding se verifica después, cuando sabemos el estado de auth
        setOnboardingChecked(true);
        
      } catch (error) {
        console.error('Error en inicialización:', error);
        setOnboardingChecked(true);
        setBiometricChecked(true);
      } finally {
        setTimeout(() => {
          setAppReady(true);
          SplashScreen.hideAsync();
        }, 100);
      }
    }
    init();
  }, []);

  // Verificar onboarding SOLO cuando sabemos el estado de autenticación
  useEffect(() => {
    async function checkOnboarding() {
      if (!appReady || isLoading) return;
      
      // Si ya está autenticado, NUNCA mostrar onboarding
      // (claramente ya lo completó en algún momento)
      if (isAuthenticated) {
        console.log('✅ Usuario autenticado - saltando onboarding');
        setShowOnboarding(false);
        // Marcar como completado por si acaso
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        return;
      }
      
      // Solo verificar onboarding si NO está autenticado
      try {
        const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_KEY);
        console.log('🎯 Onboarding completado:', onboardingCompleted);
        
        if (onboardingCompleted !== 'true') {
          console.log('🎯 Primera vez - mostrar onboarding');
          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
        }
      } catch (error) {
        console.log('Error verificando onboarding:', error);
        setShowOnboarding(false);
      }
    }
    
    checkOnboarding();
  }, [appReady, isLoading, isAuthenticated]);

  // Navegación basada en autenticación
  useEffect(() => {
    if (!appReady || isLoading || !biometricChecked || !onboardingChecked) {
      return;
    }
    
    // Si está bloqueado, no navegar
    if (isLocked) {
      return;
    }
    
    console.log('🔐 Layout: Verificando navegación...');
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - showOnboarding:', showOnboarding);
    console.log('  - segments:', segments);
    
    const currentRoute = segments[0] || '';
    
    // Si está autenticado, ir a inicio (NUNCA onboarding)
    if (isAuthenticated) {
      if (currentRoute !== '(tabs)') {
        console.log('➡️ Redirigiendo a inicio (autenticado)');
        router.replace('/(tabs)/inicio');
      }
      return;
    }
    
    // NO autenticado: verificar onboarding
    if (showOnboarding && currentRoute !== 'onboarding') {
      console.log('➡️ Redirigiendo a onboarding');
      router.replace('/onboarding');
      return;
    }
    
    // NO autenticado y onboarding completado: ir a login
    if (!showOnboarding && currentRoute !== 'login' && currentRoute !== 'onboarding') {
      console.log('➡️ Redirigiendo a login (no autenticado)');
      router.replace('/login');
    }
  }, [isAuthenticated, appReady, isLoading, isLocked, biometricChecked, onboardingChecked, showOnboarding]);

  // Desbloquear app
  const handleUnlock = () => {
    console.log('🔓 App desbloqueada');
    setIsLocked(false);
  };

  // Pantalla de carga
  if (!appReady || isLoading || !biometricChecked || !onboardingChecked) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  // Pantalla de bloqueo (solo si está autenticado Y bloqueado)
  if (isAuthenticated && isLocked && biometricType !== 'none') {
    return (
      <>
        <LockScreen onUnlock={handleUnlock} biometricType={biometricType} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

// Layout principal envuelto en ThemeProvider
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
