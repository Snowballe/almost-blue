/**
 * Tests unitaires pour useSectorsStore.
 *
 * On accède au store via getState() (pas via les hooks React) pour rester
 * dans un contexte Jest pur, sans composant rendu.
 *
 * AsyncStorage est mocké via jest.config.js → tous les effets persist sont
 * des no-ops (pas d'écriture disque réelle).
 */

import {useSectorsStore} from '../../src/stores/useSectorsStore';

beforeEach(() => {
  // Réinitialiser les favoris avant chaque test.
  // setState sans 'true' merge → les fonctions du store restent intactes.
  useSectorsStore.setState({favoriteIds: []});
});

// ─── isFavorite ───────────────────────────────────────────────────────────────

describe('isFavorite', () => {
  it("retourne true si l'ID est dans les favoris", () => {
    useSectorsStore.setState({favoriteIds: ['secteur-1']});
    expect(useSectorsStore.getState().isFavorite('secteur-1')).toBe(true);
  });

  it("retourne false si l'ID est absent", () => {
    expect(useSectorsStore.getState().isFavorite('absent')).toBe(false);
  });

  it('retourne false sur un store vide', () => {
    expect(useSectorsStore.getState().isFavorite('secteur-1')).toBe(false);
  });
});

// ─── toggleFavorite ───────────────────────────────────────────────────────────

describe('toggleFavorite', () => {
  it("ajoute un ID absent", () => {
    useSectorsStore.getState().toggleFavorite('secteur-1');
    expect(useSectorsStore.getState().favoriteIds).toContain('secteur-1');
  });

  it("retire un ID présent", () => {
    useSectorsStore.setState({favoriteIds: ['secteur-1']});
    useSectorsStore.getState().toggleFavorite('secteur-1');
    expect(useSectorsStore.getState().favoriteIds).not.toContain('secteur-1');
  });

  it('toggle aller-retour → état initial retrouvé', () => {
    useSectorsStore.getState().toggleFavorite('secteur-1');
    useSectorsStore.getState().toggleFavorite('secteur-1');
    expect(useSectorsStore.getState().favoriteIds).not.toContain('secteur-1');
  });

  /**
   * TEST DE RÉGRESSION : toggleFavorite atomique (bug #12).
   * Avant le fix, la lecture et l'écriture étaient séparées (antipattern read-then-write).
   * On vérifie que plusieurs toggles successifs sur le même ID restent cohérents.
   */
  it('[régression atomicité] n toggles alternés → état cohérent', () => {
    // 4 toggles : add → remove → add → remove → doit être absent
    for (let i = 0; i < 4; i++) {
      useSectorsStore.getState().toggleFavorite('secteur-1');
    }
    expect(useSectorsStore.getState().favoriteIds).not.toContain('secteur-1');
  });

  it("toggles sur des IDs différents n'interfèrent pas", () => {
    useSectorsStore.getState().toggleFavorite('secteur-1');
    useSectorsStore.getState().toggleFavorite('secteur-2');
    useSectorsStore.getState().toggleFavorite('secteur-1'); // retire secteur-1
    const ids = useSectorsStore.getState().favoriteIds;
    expect(ids).not.toContain('secteur-1');
    expect(ids).toContain('secteur-2');
  });
});
