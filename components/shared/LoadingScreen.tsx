// ==========================================
// LOADING SCREEN — flat
// ==========================================

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Theme } from '../../constants/Colors';

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
}

export default function LoadingScreen({
  message = 'Cargando...',
  showLogo = true,
}: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      {showLogo && (
        <View style={styles.logo}>
          <Feather name="users" size={36} color={Colors.primary} />
        </View>
      )}

      <ActivityIndicator
        size="small"
        color={Colors.primary}
        style={styles.spinner}
      />

      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
    backgroundColor: Colors.bgPrimary,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
  },
  spinner: {
    marginBottom: Theme.spacing.md,
  },
  message: {
    fontSize: Theme.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
