// ==========================================
// 📱 TABS LAYOUT - Con tema dinámico
// ==========================================
// Ubicación: app/(tabs)/_layout.tsx

import React, { useEffect, useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { useStore } from '../../store/useStore';
import { useTheme, Theme } from '../../context/ThemeContext';
import TutorialOverlay, { shouldShowTutorial } from '../../components/TutorialOverlay';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useStore();
  const { isDark, colors } = useTheme();
  
  // Estado del tutorial
  const [showTutorial, setShowTutorial] = useState(false);

  // Verificar si mostrar tutorial al montar
  useEffect(() => {
    async function checkTutorial() {
      const shouldShow = await shouldShowTutorial();
      if (shouldShow) {
        // Pequeño delay para que la pantalla cargue primero
        setTimeout(() => setShowTutorial(true), 800);
      }
    }
    
    if (isAuthenticated && !isLoading) {
      checkTutorial();
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const TabBarBackground = () => (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.tabBarBg },
      ]}
    />
  );

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 1,
            borderTopColor: colors.tabBarBorder,
            backgroundColor: 'transparent',
            elevation: 0,
            height: Platform.OS === 'ios' ? 85 : 65,
            paddingBottom: Platform.OS === 'ios' ? 25 : 10,
            paddingTop: 10,
          },
          tabBarBackground: TabBarBackground,
          tabBarLabelStyle: {
            fontSize: Theme.fontSize.xs,
            fontWeight: Theme.fontWeight.medium,
          },
        }}
      >
        <Tabs.Screen
          name="inicio"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="asistencia"
          options={{
            title: 'Asistencia',
            tabBarIcon: ({ color, size }) => (
              <Feather name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="horarios"
          options={{
            title: 'Horarios',
            tabBarIcon: ({ color, size }) => (
              <Feather name="clock" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tareas"
          options={{
            title: 'Tareas',
            tabBarIcon: ({ color, size }) => (
              <Feather name="edit-3" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calificaciones"
          options={{
            title: 'Notas',
            tabBarIcon: ({ color, size }) => (
              <Feather name="award" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="mensajes"
          options={{
            title: 'Mensajes',
            tabBarIcon: ({ color, size }) => (
              <Feather name="message-circle" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size} color={color} />
            ),
          }}
        />
        {/* Ocultar avisos, estadísticas, historial y disciplina del tab bar */}
        <Tabs.Screen
          name="avisos"
          options={{
            href: null, // No mostrar en tab bar - acceder desde Perfil
          }}
        />
        <Tabs.Screen
          name="estadisticas"
          options={{
            href: null, // No mostrar en tab bar
          }}
        />
        <Tabs.Screen
          name="historial"
          options={{
            href: null, // No mostrar en tab bar
          }}
        />
        <Tabs.Screen
          name="disciplina"
          options={{
            href: null, // Acceder desde Inicio o desde notificación de reporte/pase
          }}
        />
        <Tabs.Screen
          name="maestros"
          options={{
            href: null, // Acceder desde Perfil
          }}
        />
      </Tabs>

      {/* Tutorial Overlay - persiste entre tabs */}
      {showTutorial && (
        <TutorialOverlay onComplete={() => setShowTutorial(false)} />
      )}
    </>
  );
}
