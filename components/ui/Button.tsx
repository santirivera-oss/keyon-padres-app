// ==========================================
// BUTTON — Claude Console flat
// ==========================================

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Theme } from '../../constants/Colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const handlePress = () => {
    if (!disabled && !loading) {
      triggerHaptic();
      onPress();
    }
  };

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 16 },
    md: { paddingVertical: 14, paddingHorizontal: 20 },
    lg: { paddingVertical: 16, paddingHorizontal: 24 },
  };

  const textSizes = { sm: 14, md: 15, lg: 16 };
  const isDisabled = disabled || loading;

  const bgByVariant: Record<string, ViewStyle> = {
    primary: { backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.primary },
    secondary: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
    danger: { backgroundColor: Colors.danger, borderWidth: 1, borderColor: Colors.danger },
  };

  const textColorByVariant: Record<string, string> = {
    primary: '#ffffff',
    secondary: Colors.textPrimary,
    outline: Colors.textPrimary,
    ghost: Colors.textSecondary,
    danger: '#ffffff',
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.button,
        sizeStyles[size],
        bgByVariant[variant],
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColorByVariant[variant]} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <>{icon}</>}
          <Text
            style={[
              styles.text,
              { fontSize: textSizes[size], color: textColorByVariant[variant] },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <>{icon}</>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.md,
    gap: 8,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.4 },
  text: { fontWeight: Theme.fontWeight.semibold },
});
