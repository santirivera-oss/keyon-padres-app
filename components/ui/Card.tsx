// ==========================================
// CARD — flat, 1px border
// ==========================================

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors, Theme } from '../../constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: any;
  variant?: 'default' | 'elevated' | 'outlined';
}

export default function Card({ children, style, colors, variant = 'default' }: CardProps) {
  const bg = colors?.bgCard || Colors.bgCard;
  const border = colors?.border || Colors.border;

  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case 'elevated':
        return { backgroundColor: colors?.bgElevated || Colors.bgElevated, borderWidth: 1, borderColor: border };
      case 'outlined':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: border };
      default:
        return { backgroundColor: bg, borderWidth: 1, borderColor: border };
    }
  })();

  return <View style={[styles.card, variantStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
  },
});
