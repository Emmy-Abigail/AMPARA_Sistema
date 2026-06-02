// Fuentes: Inter (cuerpo/UI) + Montserrat (títulos/marca)
// Nombres exactos registrados en App.tsx → useFonts({ Inter_Regular, Montserrat_ExtraBold })

export const fontFamily = {
  inter: {
    regular: 'Inter-Regular',
  },
  montserrat: {
    extraBold: 'Montserrat-ExtraBold',
  },
} as const;

// Nombres de fuente seguros con fallback al sistema operativo.
// Usar getFonts() en pantallas; nunca pasar fuentes personalizadas a headers de React Navigation.
let _fontsReady = false;
export function markFontsReady() { _fontsReady = true; }
export function getFonts() {
  return {
    regular: _fontsReady ? fontFamily.inter.regular : 'System',
    bold: _fontsReady ? fontFamily.montserrat.extraBold : 'System',
  };
}

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

// Estilos de texto predefinidos
// Sólo se usan las dos fuentes disponibles en assets/fonts/
export const textStyles = {
  // Títulos — Montserrat ExtraBold (marca SIVAPRE)
  h1: {
    fontFamily: fontFamily.montserrat.extraBold,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamily.montserrat.extraBold,
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontFamily: fontFamily.montserrat.extraBold,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.snug,
  },
  h4: {
    fontFamily: fontFamily.montserrat.extraBold,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * lineHeight.snug,
  },

  // Cuerpo — Inter Regular
  bodyLarge: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.normal,
  },
  body: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodySmall: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
  },

  // UI
  label: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.snug,
    letterSpacing: letterSpacing.wide,
  },
  button: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.wide,
  },
  caption: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * lineHeight.normal,
  },
} as const;
