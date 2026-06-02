// theme-context.tsx — estado del tema compartido globalmente via Context

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { storage, StorageKeys } from '../store/storage';
import type { AppColors } from './colors';
import type { ThemeMode } from '../types';

interface ThemeContextValue {
  colors: AppColors;
  mode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  mode: 'system',
  isDark: false,
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.getItem(StorageKeys.THEME_MODE).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setMode(saved);
      }
    });
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    storage.setItem(StorageKeys.THEME_MODE, newMode);
    setMode(newMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, mode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
