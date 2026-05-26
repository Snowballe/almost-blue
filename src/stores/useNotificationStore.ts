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
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    set => ({
      lastScores: {},
      setScores: scores => set({lastScores: scores}),
      clearScores: () => set({lastScores: {}}),
    }),
    {
      name: 'notification-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
