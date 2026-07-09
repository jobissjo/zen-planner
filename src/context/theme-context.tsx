import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  resolvedTheme: 'light' | 'dark';
  themeColors: typeof Colors.light | typeof Colors.dark;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ASYNC_STORAGE_KEY = '@zen_planner_theme_mode';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    async function loadThemeMode() {
      try {
        const savedMode = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setThemeModeState(savedMode);
        }
      } catch (e) {
        console.error('Failed to load theme mode', e);
      }
    }
    loadThemeMode();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, mode);
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  };

  const resolvedTheme =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode;

  const themeColors = Colors[resolvedTheme];

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, resolvedTheme, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeMode must be used within an AppThemeProvider');
  }
  return context;
}
