// ==========================================
// KEYON PADRES — PALETA CLAUDE CONSOLE
// Flat · sin gradientes · sin neón · sin glow
// ==========================================

export const Colors = {
  // Fondos
  bgPrimary: '#191919',       // deep — fondo principal
  bgSecondary: '#1f1e1d',     // surface elevado
  bgCard: '#262624',          // surface card
  bgElevated: '#2d2c2a',      // surface +1
  surface: '#262624',

  // Textos
  textPrimary: '#f5f4ed',     // text-main
  textSecondary: '#b4b2a7',   // text-muted
  textMuted: '#7a7870',       // text-subtle
  textInverse: '#191919',

  // Acentos (un solo primario cálido — ámbar Claude)
  primary: '#d97757',
  primaryDark: '#c2613f',
  secondary: '#d97757',       // compat: mismo primary
  secondaryDark: '#c2613f',

  // Estados (planos, sin "Light" variants translúcidos)
  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.12)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  danger: '#ef4444',
  dangerLight: 'rgba(239, 68, 68, 0.12)',
  info: '#d97757',
  infoLight: 'rgba(217, 119, 87, 0.12)',

  // Bordes (solo líneas sutiles)
  border: '#3a3a38',
  borderLight: '#2f2e2c',

  // Compat: arrays de gradiente ahora devuelven color plano duplicado
  // (por si algún componente legacy aún los consume)
  gradientPrimary: ['#d97757', '#d97757'] as const,
  gradientSuccess: ['#22c55e', '#22c55e'] as const,
  gradientDanger: ['#ef4444', '#ef4444'] as const,
  gradientWarning: ['#f59e0b', '#f59e0b'] as const,
  gradientDark: ['#191919', '#191919', '#191919'] as const,

  // Overlays planos
  overlay: 'rgba(0, 0, 0, 0.6)',
  glass: '#1f1e1d',
  glassLight: '#262624',

  // Sombras (solo para elevación estructural, no efecto)
  shadowColor: '#000',
  shadowPrimary: 'transparent',
  shadowSecondary: 'transparent',
};

export const Theme = {
  borderRadius: {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Sombras mínimas — solo separación estructural
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
    // "glow" deprecado — mantenido como alias de md para no romper imports
    glow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
  },
};

export default Colors;
