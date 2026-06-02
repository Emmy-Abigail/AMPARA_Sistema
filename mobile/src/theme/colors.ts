// colors.ts — solo paletas, sin hooks ni estado
// Paleta grape/violeta basada en el branding de Ampara

export const lightColors = {
  // Grape violet — #6E2DB0 (oscuro) → #8B43D4 (medio) → #B07BE6 (claro)
  primary:       '#8B43D4',
  primaryLight:  '#B07BE6',
  primaryDark:   '#6E2DB0',
  primarySubtle: '#F3EFFE',

  background:    '#F8F5FE',
  surface:       '#FFFFFF',
  surfaceVariant:'#F0EAFB',

  text:           '#1A0A2E',
  textSecondary:  '#5E4480',
  textDisabled:   '#B09CC8',
  textOnPrimary:  '#FFFFFF',

  border:   '#DDD0F5',
  divider:  '#EBE3F9',

  error:      '#D32F2F',
  errorLight: '#FFEBEE',
  errorText:  '#B71C1C',

  warning:     '#C2410C',
  warningLight:'#FFF7ED',
  warningText: '#9A3412',

  success:     '#15803D',
  successLight:'#F0FDF4',
  successText: '#14532D',

  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow:  'rgba(139, 67, 212, 0.15)',
} as const;

export const darkColors = {
  primary:       '#C084FC',
  primaryLight:  '#D8B4FE',
  primaryDark:   '#A855F7',
  primarySubtle: '#2E1B4E',

  background:    '#0D0818',
  surface:       '#1A1028',
  surfaceVariant:'#261840',

  text:           '#F3EFFE',
  textSecondary:  '#C4A8E8',
  textDisabled:   '#6B4E8A',
  textOnPrimary:  '#0D0818',

  border:  '#3D2B6B',
  divider: '#2E1B4E',

  error:      '#EF5350',
  errorLight: '#4E1010',
  errorText:  '#FF8A80',

  warning:     '#FB923C',
  warningLight:'#431407',
  warningText: '#FED7AA',

  success:     '#4ADE80',
  successLight:'#052E16',
  successText: '#BBF7D0',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow:  'rgba(192, 132, 252, 0.15)',
} as const;

export type AppColors = typeof lightColors | typeof darkColors;

export const Colors = {
  light: lightColors,
  dark:  darkColors,
} as const;
