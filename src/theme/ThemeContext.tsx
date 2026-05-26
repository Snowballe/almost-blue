import React, {createContext, useContext} from 'react';
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
  return (
    <ThemeContext.Provider value={colorScheme === 'light' ? lightTheme : darkTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
