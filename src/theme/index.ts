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

/** Zone de touch minimale recommandée pour les icônes/boutons petits. */
export const HIT_SLOP = {top: 12, bottom: 12, left: 12, right: 12} as const;

/** Opacité standard au tap — uniformisée à 0.7 dans toute l'app. */
export const ACTIVE_OPACITY = 0.7;
