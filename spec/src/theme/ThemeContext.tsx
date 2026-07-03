import React, {createContext, useContext, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {darkColors, lightColors, Colors} from './colors';
import {typography} from './typography';
import {spacing} from './spacing';
import {useSettingsStore} from '../stores/useSettingsStore';

export type AppTheme = {
  colors: Colors;
  typography: typeof typography;
  spacing: typeof spacing;
};

export const darkTheme: AppTheme = {colors: darkColors, typography, spacing};
export const lightTheme: AppTheme = {colors: lightColors, typography, spacing};

const ThemeContext = createContext<AppTheme>(darkTheme);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const colorScheme = useSettingsStore(s => s.colorScheme);
  // activeScheme trails colorScheme by one render so the overlay can paint first
  const [activeScheme, setActiveScheme] = useState(colorScheme);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (colorScheme === activeScheme) return;
    // 1. Show overlay immediately (old theme still active — cheap render)
    setTransitioning(true);
    // 2. On next frame, apply the expensive theme re-render under the overlay
    const timer = setTimeout(() => {
      setActiveScheme(colorScheme);
      setTransitioning(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [colorScheme, activeScheme]);

  const theme = activeScheme === 'light' ? lightTheme : darkTheme;
  // Destination background for the overlay — matches the incoming theme so the
  // flash is invisible instead of white.
  const destColors = colorScheme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={theme}>
      <View style={styles.flex}>
        {children}
        {transitioning && (
          <View style={[styles.overlay, {backgroundColor: destColors.background}]}>
            <ActivityIndicator color={destColors.textMuted} size="small" />
          </View>
        )}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}

const styles = StyleSheet.create({
  flex:    {flex: 1},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
