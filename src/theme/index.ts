export {colors, darkColors, lightColors} from './colors';
export type {Colors} from './colors';
export {typography} from './typography';
export {spacing} from './spacing';
export {ThemeProvider, useTheme, darkTheme, lightTheme} from './ThemeContext';
export type {AppTheme} from './ThemeContext';

import {colors} from './colors';
import {typography} from './typography';
import {spacing} from './spacing';

/** Thème dark statique — à utiliser uniquement dans les services non-UI. */
export const theme = {colors, typography, spacing} as const;
