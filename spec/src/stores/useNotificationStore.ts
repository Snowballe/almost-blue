import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WeatherScore} from '../types/weather';

/**
 * Stocke le dernier score connu par clé `${sectorId}:${orientation}`.
 * Permet de détecter les transitions !good → good pour déclencher une notif.
 */
interface NotificationStore {
  lastScores: Record<string, WeatherScore>;
  setScores: (scores: Record<string, WeatherScore>) => void;
  clearScores: () => void;
  /** Date ISO du dernier digest envoyé ("2026-06-09"). Null si jamais envoyé. */
  lastDigestDate: string | null;
  setLastDigestDate: (date: string) => void;
  /**
   * Corps exact du dernier digest envoyé.
   * Permet de ne pas renvoyer le digest si les fenêtres favorables n'ont pas changé.
   */
  lastDigestSummary: string | null;
  setLastDigestSummary: (summary: string | null) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    set => ({
      lastScores: {},
      setScores: scores => set({lastScores: scores}),
      clearScores: () => set({lastScores: {}}),
      lastDigestDate: null,
      setLastDigestDate: date => set({lastDigestDate: date}),
      lastDigestSummary: null,
      setLastDigestSummary: summary => set({lastDigestSummary: summary}),
    }),
    {
      name: 'notification-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
