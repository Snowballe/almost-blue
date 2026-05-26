import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SeasonBound, OFFSEASON_START, OFFSEASON_END} from '../utils/seasonLogic';

export type ColorScheme = 'dark' | 'light';

interface SettingsStore {
  /** Affiche l'écran d'hibernation en saison estivale */
  hibernationEnabled: boolean;
  /**
   * Envoie des notifications push même en été.
   * Inactif pour l'instant — préparé pour v2.
   */
  notificationsInSummer: boolean;
  /**
   * Schéma de couleurs.
   * Le thème clair est prévu pour v1 — le toggle est présent mais sans effet actuellement.
   */
  colorScheme: ColorScheme;
  /** Date de début de la hors-saison (par défaut : 15 octobre). */
  offseasonStart: SeasonBound;
  /** Date de fin de la hors-saison (par défaut : 15 avril). */
  offseasonEnd: SeasonBound;

  setHibernationEnabled: (value: boolean) => void;
  setNotificationsInSummer: (value: boolean) => void;
  setColorScheme: (value: ColorScheme) => void;
  setOffseasonStart: (value: SeasonBound) => void;
  setOffseasonEnd: (value: SeasonBound) => void;
  resetOffseasonDates: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      hibernationEnabled: true,
      notificationsInSummer: false,
      colorScheme: 'dark',
      offseasonStart: OFFSEASON_START,
      offseasonEnd: OFFSEASON_END,

      setHibernationEnabled: value => set({hibernationEnabled: value}),
      setNotificationsInSummer: value => set({notificationsInSummer: value}),
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
