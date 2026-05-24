/**
 * Cozy Arcade design tokens — source of truth.
 * Tailwind config references these by mirror in tailwind.config.ts.
 * Component styles can import directly when not using NativeWind.
 */

export const colors = {
  primary: {
    50: '#FEEDEE',
    500: '#E63946',
    600: '#C62A38',
    700: '#A41E2A',
  },
  secondary: {
    500: '#2A9D8F',
    700: '#1F756B',
  },
  accent: {
    500: '#FFCB05',
    700: '#A87E00',
  },
  sky: {
    500: '#6BBFE2',
    700: '#2E6E91',
  },
  success: '#2D9D5F',
  warning: '#E68A1C',
  error: '#D6362B',
  info: '#3F76D6',
  cream: '#FFF8EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FCEFD5',
  textPrimary: '#0F1A2E',
  textSecondary: '#5E6779',
  textDisabled: '#A8B0BD',
  border: '#0F1A2E',
  dark: {
    primary: '#FF6B7A',
    bg: '#0F1421',
    surface: '#1A2236',
    textPrimary: '#F5F1E8',
    border: '#000000',
  },
} as const;

export const worldThemes = {
  generic: {
    sky: '#FFCB05',
    accent: '#E63946',
    ground: '#7DA847',
    secondary: '#6BBFE2',
  },
  usaDesert: {
    sky: '#FFB174',
    ground: '#FCE4B6',
    accent: '#3C8DBC',
    secondary: '#D6362B',
  },
  europeForest: {
    sky: '#A8D6FF',
    ground: '#86A86E',
    accent: '#D1654A',
    secondary: '#6E4628',
  },
  asiaSakura: {
    sky: '#FFD6E0',
    ground: '#9FCFA0',
    accent: '#5B3B7F',
    secondary: '#FFCB05',
  },
  tropicalBeach: {
    sky: '#5FCFE6',
    ground: '#FFF1B8',
    accent: '#FF7A4A',
    secondary: '#FF4592',
  },
} as const;

export const fonts = {
  pixel: 'PressStart2P_400Regular',
  heading: 'Fredoka_600SemiBold',
  headingBold: 'Fredoka_700Bold',
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_500Medium',
  bodySemibold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
} as const;

export const fontSizes = {
  pixel: 12,
  caption: 12,
  small: 14,
  body: 16,
  lead: 18,
  h4: 18,
  h3: 20,
  h2: 24,
  h1: 28,
  displayLg: 32,
  displayXl: 40,
} as const;

export const lineHeights = {
  pixel: 16,
  caption: 16,
  small: 20,
  body: 24,
  lead: 28,
  h4: 24,
  h3: 28,
  h2: 32,
  h1: 36,
  displayLg: 40,
  displayXl: 48,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const borderWidths = {
  default: 1,
  pixel: 3,
  pixelLg: 4,
} as const;

export const borderRadii = {
  none: 0,
  sm: 2,
  default: 4,
  md: 6,
  lg: 8,
  full: 9999,
} as const;

export const shadows = {
  pixel: { offsetX: 4, offsetY: 4, color: colors.border },
  pixelCard: { offsetX: 6, offsetY: 6, color: colors.border },
} as const;

export type WorldThemeKey = keyof typeof worldThemes;
