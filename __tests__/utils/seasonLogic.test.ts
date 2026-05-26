import {
  maxDayForMonth,
  isOffSeason,
  nextSeasonChangeDate,
  isDegenerate,
  OFFSEASON_START,
  OFFSEASON_END,
} from '../../src/utils/seasonLogic';

// ─── maxDayForMonth ───────────────────────────────────────────────────────────

describe('maxDayForMonth', () => {
  test.each([
    [1, 31], [3, 31], [5, 31], [7, 31], [8, 31], [10, 31], [12, 31],
  ])('mois %i a 31 jours', (month, expected) => {
    expect(maxDayForMonth(month)).toBe(expected);
  });

  test.each([
    [4, 30], [6, 30], [9, 30], [11, 30],
  ])('mois %i a 30 jours', (month, expected) => {
    expect(maxDayForMonth(month)).toBe(expected);
  });

  it('février a 28 jours (pas de gestion bissextile)', () => {
    expect(maxDayForMonth(2)).toBe(28);
  });
});

// ─── isOffSeason — fenêtre par défaut (1er nov → 31 mars) ────────────────────

describe('isOffSeason — fenêtre par défaut', () => {
  it('milieu de l\'hiver (15 déc) → hors-saison', () => {
    expect(isOffSeason(new Date(2026, 11, 15))).toBe(true);
  });

  it('milieu de l\'été (15 juil) → en saison', () => {
    expect(isOffSeason(new Date(2026, 6, 15))).toBe(false);
  });

  it('1er novembre : premier jour hors-saison → true', () => {
    expect(isOffSeason(new Date(2026, 10, 1))).toBe(true);
  });

  it('31 octobre : veille du début → false', () => {
    expect(isOffSeason(new Date(2026, 9, 31))).toBe(false);
  });

  it('31 mars : dernier jour hors-saison → true', () => {
    expect(isOffSeason(new Date(2026, 2, 31))).toBe(true);
  });

  it('1er avril : lendemain de la fin → false', () => {
    expect(isOffSeason(new Date(2026, 3, 1))).toBe(false);
  });

  it('1er janvier (la fenêtre chevauche le 31 déc) → hors-saison', () => {
    expect(isOffSeason(new Date(2026, 0, 1))).toBe(true);
  });

  it('15 décembre → hors-saison (même comportement en changeant d\'année)', () => {
    expect(isOffSeason(new Date(2025, 11, 15))).toBe(true);
    expect(isOffSeason(new Date(2027, 11, 15))).toBe(true);
  });
});

// ─── isOffSeason — fenêtre personnalisée ─────────────────────────────────────

describe('isOffSeason — fenêtre personnalisée', () => {
  const start = {month: 6, day: 1};  // 1er juin
  const end   = {month: 9, day: 30}; // 30 sept (fenêtre dans l'année)

  it('15 août : dans la fenêtre → true', () => {
    expect(isOffSeason(new Date(2026, 7, 15), start, end)).toBe(true);
  });

  it('1er juin : premier jour → true', () => {
    expect(isOffSeason(new Date(2026, 5, 1), start, end)).toBe(true);
  });

  it('31 mai : veille → false', () => {
    expect(isOffSeason(new Date(2026, 4, 31), start, end)).toBe(false);
  });

  it('30 sept : dernier jour → true', () => {
    expect(isOffSeason(new Date(2026, 8, 30), start, end)).toBe(true);
  });

  it('1er octobre : hors fenêtre → false', () => {
    expect(isOffSeason(new Date(2026, 9, 1), start, end)).toBe(false);
  });

  it('15 déc : hors fenêtre → false', () => {
    expect(isOffSeason(new Date(2026, 11, 15), start, end)).toBe(false);
  });
});

// ─── nextSeasonChangeDate ─────────────────────────────────────────────────────

describe('nextSeasonChangeDate', () => {
  it('en hiver → prochaine date = fin hors-saison (31 mars)', () => {
    const result = nextSeasonChangeDate(new Date(2026, 11, 15)); // 15 déc
    expect(result.getMonth() + 1).toBe(OFFSEASON_END.month);  // 3 = mars
    expect(result.getDate()).toBe(OFFSEASON_END.day);           // 31
  });

  it('en été → prochaine date = début hors-saison (1er nov)', () => {
    const result = nextSeasonChangeDate(new Date(2026, 6, 15)); // 15 juil
    expect(result.getMonth() + 1).toBe(OFFSEASON_START.month); // 11 = nov
    expect(result.getDate()).toBe(OFFSEASON_START.day);          // 1
  });

  it('en février → fin hors-saison cette année (mars n\'est pas encore passé)', () => {
    const result = nextSeasonChangeDate(new Date(2026, 1, 15)); // 15 fév
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth() + 1).toBe(3); // mars
    expect(result.getDate()).toBe(31);
  });

  it('en juillet → début hors-saison cette année (nov pas encore passé)', () => {
    const result = nextSeasonChangeDate(new Date(2026, 6, 1)); // 1er juil
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth() + 1).toBe(11); // nov
  });
});

// ─── isDegenerate ─────────────────────────────────────────────────────────────

describe('isDegenerate', () => {
  it('start === end → dégénéré', () => {
    expect(isDegenerate({month: 6, day: 15}, {month: 6, day: 15})).toBe(true);
  });

  it('start !== end (config par défaut) → non dégénéré', () => {
    expect(isDegenerate(OFFSEASON_START, OFFSEASON_END)).toBe(false);
  });

  it('dates différentes → non dégénéré', () => {
    expect(isDegenerate({month: 11, day: 1}, {month: 3, day: 31})).toBe(false);
  });
});
