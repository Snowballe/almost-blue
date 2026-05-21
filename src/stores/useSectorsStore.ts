import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SectorsStore {
  favoriteIds: string[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

export const useSectorsStore = create<SectorsStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      addFavorite: id =>
        set(s => ({favoriteIds: [...s.favoriteIds, id]})),
      removeFavorite: id =>
        set(s => ({favoriteIds: s.favoriteIds.filter(f => f !== id)})),
      isFavorite: id => get().favoriteIds.includes(id),
      toggleFavorite: id => {
        if (get().isFavorite(id)) {
          get().removeFavorite(id);
        } else {
          get().addFavorite(id);
        }
      },
    }),
    {
      name: 'sectors-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
