// ==========================================
// THEME CONTEXT — Claude Console v3.2
// Paleta plana, sin gradientes, sin neón
// ==========================================

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

// ==========================================
// MODO OSCURO — Claude Console
// ==========================================
const darkColors = {
  bgPrimary: '#191919',
  bgSecondary: '#1f1e1d',
  bgCard: '#262624',
  bgElevated: '#2d2c2a',
  surface: '#262624',

  textPrimary: '#f5f4ed',
  textSecondary: '#b4b2a7',
  textMuted: '#7a7870',
  textInverse: '#191919',

  primary: '#d97757',
  primaryDark: '#c2613f',
  secondary: '#d97757',
  secondaryDark: '#c2613f',

  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.12)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  danger: '#ef4444',
  dangerLight: 'rgba(239, 68, 68, 0.12)',
  info: '#d97757',
  infoLight: 'rgba(217, 119, 87, 0.12)',

  border: '#3a3a38',
  borderLight: '#2f2e2c',

  // Gradientes = color plano duplicado (compat legacy)
  gradientPrimary: ['#d97757', '#d97757'] as readonly string[],
  gradientSuccess: ['#22c55e', '#22c55e'] as readonly string[],
  gradientDanger: ['#ef4444', '#ef4444'] as readonly string[],
  gradientWarning: ['#f59e0b', '#f59e0b'] as readonly string[],
  gradientDark: ['#191919', '#191919', '#191919'] as readonly string[],

  overlay: 'rgba(0, 0, 0, 0.6)',
  glass: '#1f1e1d',
  glassLight: '#262624',

  shadowColor: '#000',
  shadowPrimary: 'transparent',
  shadowSecondary: 'transparent',

  tabBarBg: '#191919',
  tabBarBorder: '#3a3a38',
  tabBarActive: '#d97757',
  tabBarInactive: '#7a7870',
};

// ==========================================
// MODO CLARO — versión clara plana
// ==========================================
const lightColors: typeof darkColors = {
  bgPrimary: '#f7f6f2',
  bgSecondary: '#ffffff',
  bgCard: '#ffffff',
  bgElevated: '#faf9f5',
  surface: '#faf9f5',

  textPrimary: '#191919',
  textSecondary: '#4a4945',
  textMuted: '#7a7870',
  textInverse: '#f5f4ed',

  primary: '#c2613f',
  primaryDark: '#a54d2e',
  secondary: '#c2613f',
  secondaryDark: '#a54d2e',

  success: '#15803d',
  successLight: 'rgba(21, 128, 61, 0.10)',
  warning: '#b45309',
  warningLight: 'rgba(180, 83, 9, 0.10)',
  danger: '#b91c1c',
  dangerLight: 'rgba(185, 28, 28, 0.10)',
  info: '#c2613f',
  infoLight: 'rgba(194, 97, 63, 0.10)',

  border: '#e5e3dc',
  borderLight: '#efeee8',

  gradientPrimary: ['#c2613f', '#c2613f'] as readonly string[],
  gradientSuccess: ['#15803d', '#15803d'] as readonly string[],
  gradientDanger: ['#b91c1c', '#b91c1c'] as readonly string[],
  gradientWarning: ['#b45309', '#b45309'] as readonly string[],
  gradientDark: ['#f7f6f2', '#f7f6f2', '#f7f6f2'] as readonly string[],

  overlay: 'rgba(0, 0, 0, 0.3)',
  glass: '#ffffff',
  glassLight: '#faf9f5',

  shadowColor: '#000',
  shadowPrimary: 'transparent',
  shadowSecondary: 'transparent',

  tabBarBg: '#ffffff',
  tabBarBorder: '#e5e3dc',
  tabBarActive: '#c2613f',
  tabBarInactive: '#7a7870',
};

// ==========================================
// THEME CONSTANTS
// ==========================================
export const Theme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// ==========================================
// CONTEXT
// ==========================================
export type ColorsType = typeof darkColors;

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorsType;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('keyon_theme_mode').then((savedMode) => {
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setModeState(savedMode as ThemeMode);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem('keyon_theme_mode', newMode);
    } catch (e) {
      console.log('Error saving theme:', e);
    }
  };

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  const value = useMemo(() => ({
    mode,
    isDark,
    colors,
    setMode,
  }), [mode, isDark, colors]);

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      mode: 'dark',
      isDark: true,
      colors: darkColors,
      setMode: () => {},
    };
  }
  return context;
}

export const Colors = darkColors;
