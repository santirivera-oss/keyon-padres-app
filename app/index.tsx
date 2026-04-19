// ==========================================
// 🚀 INDEX - Punto de entrada de la app
// ==========================================
// Ubicación: app/index.tsx

import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useStore();
  const { colors } = useTheme();

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Redirigir según el estado de autenticación
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/inicio" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
