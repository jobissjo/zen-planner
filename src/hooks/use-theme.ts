/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useContext } from 'react';
import { ThemeContext } from '@/context/theme-context';

export function useTheme() {
  const scheme = useColorScheme();
  const context = useContext(ThemeContext);
  if (context) {
    return context.themeColors;
  }

  const theme = scheme === 'unspecified' ? 'light' : scheme;

  return Colors[theme];
}
