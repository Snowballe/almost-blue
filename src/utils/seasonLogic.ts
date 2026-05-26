/**
 * Logique de saison pour Almost Blue.
 *
 * Hors-saison par défaut : 15 octobre → 15 avril (inclusif des deux bornes).
 * Été par défaut         : 16 avril   → 14 octobre → hibernation de l'app.
 *
 * Les fonctions acceptent des dates de début/fin optionnelles pour permettre
 * à l'utilisateur de personnaliser sa fenêtre hors-saison.
 */

export type SeasonBound = {month: number; day: number};

export const OFFSEASON_START: SeasonBound = {month: 10, day: 15}; // 15 oct
export const OFFSEASON_END:   SeasonBound = {month:  4, day: 15}; // 15 avr

/** Nombre maximum de jours dans un mois (sans contexte d'année — fév = 28). */
export function maxDayForMonth(month: number): number {
  if ([1, 3, 5, 7, 8, 10, 12].includes(month)) return 31;
  if (month === 2) return 28; // pas de gestion bissextile sur des dates récurrentes
  return 30; // avr, juin, sept, nov
}

/**
 * Encodage compact mois+jour pour comparaisons.
 * Fonctionne tant que day ∈ [1,31] et month ∈ [1,12].
 * Exemple : 15 oct → 1015, 15 avr → 415.
 */
function encode(month: number, day: number): number {
  return month * 100 + day;
}

/**
 * Retourne true si `date` est dans la fenêtre hors-saison.
 *
 * Deux cas supportés :
 *  - Fenêtre croise le 31 déc (start.month > end.month, ex. oct→avr) :
 *      current >= start  OU  current <= end
 *  - Fenêtre dans l'année (start.month < end.month, ex. jan→juin) :
 *      current >= start  ET  current <= end
 *  - start === end : toute l'année est hors-saison (cas dégénéré).
 */
export function isOffSeason(
  date: Date = new Date(),
  start: SeasonBound = OFFSEASON_START,
  end: SeasonBound = OFFSEASON_END,
): boolean {
  const current = encode(date.getMonth() + 1, date.getDate());
  const s = encode(start.month, start.day);
  const e = encode(end.month, end.day);

  if (s === e) return true; // dégénéré — toute l'année

  if (s > e) {
    // Croise le 31 déc (cas nominal : oct → avr)
    return current >= s || current <= e;
  } else {
    // Fenêtre dans l'année (ex : jan → juin)
    return current >= s && current <= e;
  }
}

/**
 * Retourne la prochaine date de changement de saison (à minuit).
 *
 * - En été (hibernation)  → prochaine date END   (réveil de l'app)
 * - En hors-saison        → prochaine date END   (entrée en hibernation)
 *
 * "Prochaine occurrence" = cette année si la date n'est pas encore passée,
 * sinon l'année suivante.
 */
export function nextSeasonChangeDate(
  date: Date = new Date(),
  start: SeasonBound = OFFSEASON_START,
  end: SeasonBound = OFFSEASON_END,
): Date {
  const year = date.getFullYear();
  const today = encode(date.getMonth() + 1, date.getDate());

  // Si on est en hors-saison → prochain passage en été = date END
  // Si on est en été         → prochain passage en hors-saison = date START
  const target = isOffSeason(date, start, end) ? end : start;
  const targetCode = encode(target.month, target.day);

  const candidate = new Date(year, target.month - 1, target.day);
  // Avancer d'un an seulement si la date cible est strictement dans le passé aujourd'hui
  if (targetCode < today) {
    candidate.setFullYear(year + 1);
  }
  return candidate;
}

/**
 * Retourne true si la configuration start/end est potentiellement problématique.
 * Cas dégénéré : start === end → toute l'année serait hors-saison.
 */
export function isDegenerate(start: SeasonBound, end: SeasonBound): boolean {
  return encode(start.month, start.day) === encode(end.month, end.day);
}
