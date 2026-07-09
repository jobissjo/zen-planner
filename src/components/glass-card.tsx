import React from 'react';
import { View, StyleSheet, Platform, type ViewProps } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '@/hooks/use-theme';

// Safe checking for native glass availability
let isNativeGlassSupported = false;
try {
  isNativeGlassSupported = Platform.OS === 'ios' && isGlassEffectAPIAvailable();
} catch {
  // Silent fallback if module is not present/fully compiled
}

export type GlassCardProps = ViewProps & {
  intensity?: 'light' | 'regular';
};

export function GlassCard({ style, children, intensity = 'light', ...rest }: GlassCardProps) {
  const theme = useTheme();

  const fallbackStyle = [
    styles.glassFallback,
    {
      backgroundColor: theme.backgroundGlass,
      borderColor: theme.borderGlass,
    },
    Platform.OS === 'web' && {
      backdropFilter: intensity === 'light' ? 'blur(8px)' : 'blur(16px)',
      WebkitBackdropFilter: intensity === 'light' ? 'blur(8px)' : 'blur(16px)',
    },
    style,
  ];

  if (isNativeGlassSupported) {
    return (
      <GlassView
        glassEffectStyle={{
          style: intensity === 'light' ? 'clear' : 'regular',
        }}
        tintColor={theme.glassTint}
        style={[
          styles.iosGlass,
          {
            borderColor: theme.borderGlass,
            backgroundColor: theme.backgroundGlass,
          },
          style,
        ]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={fallbackStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  iosGlass: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glassFallback: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
});
