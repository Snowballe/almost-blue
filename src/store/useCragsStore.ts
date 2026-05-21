import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Crag} from '../types/crag';

interface CragsStore {
  favorites: Crag[];
  addFavorite: (crag: Crag) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

export const useCragsStore = create<CragsStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: crag =>
        set(s => ({favorites: [...s.favorites, crag]})),
      removeFavorite: id =>
        set(s => ({favorites: s.favorites.filter(c => c.id !== id)})),
      isFavorite: id => get().favorites.some(c => c.id === id),
    }),
    {
      name: 'crags-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
