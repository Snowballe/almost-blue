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
        // Déduplication : on n'ajoute que si l'ID n'est pas déjà présent,
        // ce qui évite les doublons en cas de double-tap ou d'appel concurrent.
        set(s =>
          s.favoriteIds.includes(id)
            ? s
            : {favoriteIds: [...s.favoriteIds, id]},
        ),
      removeFavorite: id =>
        set(s => ({favoriteIds: s.favoriteIds.filter(f => f !== id)})),
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
