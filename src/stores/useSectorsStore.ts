import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SectorsStore {
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

export const useSectorsStore = create<SectorsStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      isFavorite: id => get().favoriteIds.includes(id),
      // toggleFavorite atomique : la lecture ET l'écriture se font dans le même
      // set() pour éviter un antipattern read-then-write hors de set().
      toggleFavorite: id =>
        set(s => ({
          favoriteIds: s.favoriteIds.includes(id)
            ? s.favoriteIds.filter(f => f !== id)
            : [...s.favoriteIds, id],
        })),
    }),
    {
      name: 'sectors-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
