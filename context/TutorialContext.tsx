// ==========================================
// 🎯 CONTEXTO DE TUTORIAL
// ==========================================
// Maneja el estado del onboarding interactivo

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = 'keyon_tutorial_completed';
const TUTORIAL_STEP_KEY = 'keyon_tutorial_step';

export interface TutorialStep {
  id: string;
  screen: string;           // Pantalla donde se muestra
  targetId: string;         // ID del elemento a destacar
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon?: string;
}

// Pasos del tutorial
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    screen: 'welcome',
    targetId: 'none',
    title: '¡Bienvenido a Keyon!',
    description: 'Tu aliado para monitorear la asistencia de tu hijo en tiempo real.',
    position: 'bottom',
    icon: 'shield',
  },
  {
    id: 'inicio_estado',
    screen: 'inicio',
    targetId: 'status-card',
    title: 'Estado en tiempo real',
    description: 'Aquí puedes ver si tu hijo está dentro o fuera del plantel en este momento.',
    position: 'bottom',
    icon: 'activity',
  },
  {
    id: 'inicio_registros',
    screen: 'inicio',
    targetId: 'registros-hoy',
    title: 'Registros del día',
    description: 'Consulta las entradas y salidas de hoy con hora exacta.',
    position: 'top',
    icon: 'clock',
  },
  {
    id: 'tab_asistencia',
    screen: 'tabs',
    targetId: 'tab-asistencia',
    title: 'Calendario de asistencia',
    description: 'Revisa el historial completo de asistencias por día.',
    position: 'top',
    icon: 'calendar',
  },
  {
    id: 'tab_avisos',
    screen: 'tabs',
    targetId: 'tab-avisos',
    title: 'Avisos escolares',
    description: 'Recibe noticias y comunicados importantes de la escuela.',
    position: 'top',
    icon: 'bell',
  },
  {
    id: 'tab_estadisticas',
    screen: 'tabs',
    targetId: 'tab-estadisticas',
    title: 'Estadísticas',
    description: 'Visualiza gráficas de asistencia, retardos y faltas.',
    position: 'top',
    icon: 'bar-chart-2',
  },
  {
    id: 'tab_perfil',
    screen: 'tabs',
    targetId: 'tab-perfil',
    title: 'Tu perfil',
    description: 'Configura la app, exporta reportes PDF y envía justificantes.',
    position: 'top',
    icon: 'user',
  },
];

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  currentStepData: TutorialStep | null;
  totalSteps: number;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  isTutorialCompleted: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTutorialCompleted, setIsTutorialCompleted] = useState(true);

  // Verificar si el tutorial ya fue completado
  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(TUTORIAL_KEY);
      setIsTutorialCompleted(completed === 'true');
    } catch (error) {
      console.log('Error checking tutorial status:', error);
    }
  };

  const startTutorial = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = async () => {
    setIsActive(false);
    setIsTutorialCompleted(true);
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    } catch (error) {
      console.log('Error saving tutorial status:', error);
    }
  };

  const completeTutorial = async () => {
    setIsActive(false);
    setIsTutorialCompleted(true);
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    } catch (error) {
      console.log('Error saving tutorial status:', error);
    }
  };

  const resetTutorial = async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_KEY);
      setIsTutorialCompleted(false);
      setCurrentStep(0);
    } catch (error) {
      console.log('Error resetting tutorial:', error);
    }
  };

  const currentStepData = isActive ? TUTORIAL_STEPS[currentStep] : null;

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepData,
        totalSteps: TUTORIAL_STEPS.length,
        startTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        resetTutorial,
        isTutorialCompleted,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
