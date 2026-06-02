// colors.ts — solo paletas, sin hooks ni estado

export const lightColors = {
  primary: '#0F6E56',
  primaryLight: '#1A9070',
  primaryDark: '#0A4F3E',
  primarySubtle: '#E8F5F1',

  background: '#F5F8F7',
  surface: '#FFFFFF',
  surfaceVariant: '#EDF3F1',

  text: '#1A2421',
  textSecondary: '#5A7068',
  textDisabled: '#A8BCB6',
  textOnPrimary: '#FFFFFF',

  border: '#C8D8D3',
  divider: '#E0EBEBEB',

  error: '#D32F2F',
  errorLight: '#FFEBEE',
  errorText: '#B71C1C',

  warning: '#E65100',
  warningLight: '#FFF3E0',
  warningText: '#BF360C',

  success: '#1B5E20',
  successLight: '#E8F5E9',
  successText: '#1B5E20',

  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(15, 110, 86, 0.15)',
} as const;

export const darkColors = {
  primary: '#2ECC9A',
  primaryLight: '#38DBA8',
  primaryDark: '#1A9070',
  primarySubtle: '#0A2E24',

  background: '#0D1A16',
  surface: '#152620',
  surfaceVariant: '#1E3228',

  text: '#E8F0ED',
  textSecondary: '#8FA8A0',
  textDisabled: '#4A6058',
  textOnPrimary: '#0D1A16',

  border: '#2A3D36',
  divider: '#243D35',

  error: '#EF5350',
  errorLight: '#4E1010',
  errorText: '#FF8A80',

  warning: '#FFA726',
  warningLight: '#3E2500',
  warningText: '#FFD180',

  success: '#66BB6A',
  successLight: '#1B3A1C',
  successText: '#B9F6CA',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(46, 204, 154, 0.15)',
} as const;

export type AppColors = typeof lightColors | typeof darkColors;

export const Colors = {
  light: lightColors,
  dark: darkColors,
} as const;
