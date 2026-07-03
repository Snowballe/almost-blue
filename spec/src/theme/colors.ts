export const darkColors = {
  background:   '#0D0F14',
  surface:      '#161B26',
  surfaceHigh:  '#1E2535',
  border:       '#2A3347',

  accent:       '#4D7EFF',
  accentDim:    '#1E3080',

  textPrimary:  '#E8EAF0',
  textMuted:    '#7B85A0',
  textDisabled: '#3D4A63',

  good:         '#5EEAD4',
  warning:      '#F59E0B',
  danger:       '#EF4444',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const lightColors = {
  background:   '#F4F5F8',
  surface:      '#FFFFFF',
  surfaceHigh:  '#ECEEF3',
  border:       '#CDD2DF',

  accent:       '#4D7EFF',
  accentDim:    '#C5D2FF',

  textPrimary:  '#1A1F2E',
  textMuted:    '#56607A',
  textDisabled: '#9BA5BC',

  // Versions légèrement plus sombres pour garder le contraste sur fond clair
  good:         '#0D9488',
  warning:      '#D97706',
  danger:       '#DC2626',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Alias rétrocompatible — utilisé par les services non-UI (weatherLogic, etc.) */
export const colors = darkColors;

/** Forme canonique — même clés que darkColors, valeurs string */
export type Colors = {[K in keyof typeof darkColors]: string};
