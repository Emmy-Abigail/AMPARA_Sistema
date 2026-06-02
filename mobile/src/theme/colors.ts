// colors.ts — solo paletas, sin hooks ni estado

export const lightColors = {
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  primaryDark: '#5B21B6',
  primarySubtle: '#EDE9FE',

  background: '#F9F7FF',
  surface: '#FFFFFF',
  surfaceVariant: '#F3EFFD',

  text: '#1A1028',
  textSecondary: '#5B4E75',
  textDisabled: '#A89BC0',
  textOnPrimary: '#FFFFFF',

  border: '#D4C8F0',
  divider: '#E8E2F8',

  error: '#D32F2F',
  errorLight: '#FFEBEE',
  errorText: '#B71C1C',

  warning: '#C2410C',
  warningLight: '#FFF7ED',
  warningText: '#9A3412',

  success: '#15803D',
  successLight: '#F0FDF4',
  successText: '#14532D',

  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(124, 58, 237, 0.15)',
} as const;

export const darkColors = {
  primary: '#A78BFA',
  primaryLight: '#C4B5FD',
  primaryDark: '#7C3AED',
  primarySubtle: '#2D1B5E',

  background: '#0F0A1A',
  surface: '#1A1028',
  surfaceVariant: '#241636',

  text: '#EDE9FE',
  textSecondary: '#A89BC0',
  textDisabled: '#5B4E75',
  textOnPrimary: '#0F0A1A',

  border: '#3D2B6B',
  divider: '#2D1B5E',

  error: '#EF5350',
  errorLight: '#4E1010',
  errorText: '#FF8A80',

  warning: '#FB923C',
  warningLight: '#431407',
  warningText: '#FED7AA',

  success: '#4ADE80',
  successLight: '#052E16',
  successText: '#BBF7D0',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(167, 139, 250, 0.15)',
} as const;

export type AppColors = typeof lightColors | typeof darkColors;

export const Colors = {
  light: lightColors,
  dark: darkColors,
} as const;
