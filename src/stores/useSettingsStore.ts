import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SeasonBound, OFFSEASON_START, OFFSEASON_END} from '../utils/seasonLogic';

export type ColorScheme = 'dark' | 'light';

/** Intervalles de vérification météo disponibles (en minutes). */
export const CHECK_INTERVALS = [60, 180, 360, 720, 1440] as const;
export type CheckInterval = (typeof CHECK_INTERVALS)[number];

export const CHECK_INTERVAL_LABELS: Record<CheckInterval, string> = {
  60:   '1h',
  180:  '3h',
  360:  '6h',
  720:  '12h',
  1440: '24h',
};

interface SettingsStore {
  /** Active les alertes push météo (transition !good → good sur un favori). */
  notificationsEnabled: boolean;
  /** Fréquence de vérification en background (minutes). Défaut : 180 = 3h. */
  checkIntervalMinutes: CheckInterval;
  /** Envoie des alertes même en saison estivale. */
  notificationsInSummer: boolean;
  /** Affiche l'écran d'hibernation en saison estivale. */
  hibernationEnabled: boolean;
  /**
   * Schéma de couleurs.
   * Le thème clair est prévu pour v1 — le toggle est présent mais sans effet actuellement.
   */
  colorScheme: ColorScheme;
  /** Date de début de la hors-saison (par défaut : 1er novembre). */
  offseasonStart: SeasonBound;
  /** Date de fin de la hors-saison (par défaut : 31 mars). */
  offseasonEnd: SeasonBound;

  setNotificationsEnabled: (value: boolean) => void;
  setCheckIntervalMinutes: (value: CheckInterval) => void;
  setNotificationsInSummer: (value: boolean) => void;
  setHibernationEnabled: (value: boolean) => void;
  setColorScheme: (value: ColorScheme) => void;
  setOffseasonStart: (value: SeasonBound) => void;
  setOffseasonEnd: (value: SeasonBound) => void;
  resetOffseasonDates: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      notificationsEnabled: true,
      checkIntervalMinutes: 180,
      notificationsInSummer: false,
      hibernationEnabled: true,
      colorScheme: 'dark',
      offseasonStart: OFFSEASON_START,
      offseasonEnd: OFFSEASON_END,

      setNotificationsEnabled: value => set({notificationsEnabled: value}),
      setCheckIntervalMinutes: value => set({checkIntervalMinutes: value}),
      setNotificationsInSummer: value => set({notificationsInSummer: value}),
      setHibernationEnabled: value => set({hibernationEnabled: value}),
      setColorScheme: value => set({colorScheme: value}),
      setOffseasonStart: value => set({offseasonStart: value}),
      setOffseasonEnd: value => set({offseasonEnd: value}),
      resetOffseasonDates: () =>
        set({offseasonStart: OFFSEASON_START, offseasonEnd: OFFSEASON_END}),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
