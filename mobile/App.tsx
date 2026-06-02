// App.tsx

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation';
import { useTheme, ThemeProvider } from './src/theme';
import { markFontsReady } from './src/theme/typography';
import { AuthProvider } from './src/store/auth-context';

// Mantiene el splash nativo visible hasta que las fuentes carguen
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 10,   // 10 minutos
    },
    mutations: {
      retry: 0,
    },
  },
});

// ─── Núcleo de la app (dentro de los providers) ───────────────────────────────

function AppContent() {
  const { colors, isDark } = useTheme();

  // Tema de React Navigation: hereda fonts del sistema, sobreescribe solo colores
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

// ─── Raíz: carga fuentes → oculta splash nativo → renderiza app ──────────────

export default function App() {
  const [fontsLoaded, fontError] = Font.useFonts({
    'Inter-Regular': require('./assets/fonts/Inter_18pt-Regular.ttf'),
    'Montserrat-ExtraBold': require('./assets/fonts/Montserrat-ExtraBold.ttf'),
  });

  // Se dispara cuando el View raíz termina de posicionarse (fuentes ya listas)
  const onRootLayout = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      markFontsReady();
    }
    if (fontError) {
      console.warn('[SIVAPRE] Error cargando fuentes locales:', fontError.message);
    }
  }, [fontsLoaded, fontError]);

  // Bloquea el render hasta que las fuentes estén listas
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <View style={styles.root} onLayout={onRootLayout}>
              <AppContent />
            </View>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
