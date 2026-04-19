// ==========================================
// LOGIN — Claude Console flat
// ==========================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { Colors, Theme } from '../constants/Colors';
import Button from '../components/ui/Button';

export default function LoginScreen() {
  const [control, setControl] = useState('');
  const [codigo, setCodigo] = useState('');
  const [showCodigo, setShowCodigo] = useState(false);
  const { login, isLoading, error } = useStore();

  const handleLogin = async () => {
    if (!control.trim()) {
      Alert.alert('Error', 'Ingresa el número de control');
      return;
    }
    if (!codigo.trim()) {
      Alert.alert('Error', 'Ingresa el código de acceso');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const success = await login({ control: control.trim(), codigo: codigo.trim().toUpperCase() });

    if (!success && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>KEYON</Text>
          </View>

          {/* Encabezado */}
          <View style={styles.header}>
            <Text style={styles.title}>Ingresar</Text>
            <Text style={styles.subtitle}>
              Usa el número de control de tu hijo y el código que te dio la escuela.
            </Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {/* Control */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de control</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 23332050010485"
                  placeholderTextColor={Colors.textMuted}
                  value={control}
                  onChangeText={setControl}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Código */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de acceso</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="6 caracteres"
                  placeholderTextColor={Colors.textMuted}
                  value={codigo}
                  onChangeText={(text) => setCodigo(text.toUpperCase())}
                  secureTextEntry={!showCodigo}
                  keyboardType="default"
                  autoCapitalize="characters"
                  maxLength={8}
                />
                <TouchableOpacity
                  onPress={() => setShowCodigo(!showCodigo)}
                  style={styles.eyeButton}
                >
                  <Feather
                    name={showCodigo ? 'eye-off' : 'eye'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Botón */}
            <Button
              title={isLoading ? 'Ingresando...' : 'Ingresar'}
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              icon={<Feather name="arrow-right" size={18} color="#ffffff" />}
              iconPosition="right"
            />

            {/* Ayuda */}
            <TouchableOpacity style={styles.helpLink}>
              <Feather name="help-circle" size={14} color={Colors.textSecondary} />
              <Text style={styles.helpText}>¿Cómo obtengo mi código?</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 Keyon Access System</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Theme.spacing.xl,
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
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    paddingLeft: Theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    fontSize: Theme.fontSize.md,
    color: Colors.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: Theme.spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: Theme.fontSize.sm,
    color: Colors.danger,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.lg,
    gap: 6,
  },
  helpText: {
    fontSize: Theme.fontSize.sm,
    color: Colors.textSecondary,
  },
  footer: {
    marginTop: Theme.spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Theme.fontSize.xs,
    color: Colors.textMuted,
  },
});
