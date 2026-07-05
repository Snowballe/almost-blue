package com.almostblue.domain

import java.time.LocalDate

/**
 * Logique de saison — port 1:1 de spec/src/utils/seasonLogic.ts.
 *
 * Hors-saison par défaut : 1er novembre → 31 mars (fin automne + hiver + début printemps).
 * Hibernation par défaut : 1er avril    → 31 octobre (beau temps, pas besoin d'alertes).
 * Les fonctions acceptent des dates de début/fin optionnelles pour permettre
 * à l'utilisateur de personnaliser sa fenêtre hors-saison.
 */

data class SeasonBound(val month: Int, val day: Int)

val OFFSEASON_START = SeasonBound(month = 11, day = 1) // 1er novembre
val OFFSEASON_END = SeasonBound(month = 3, day = 31)   // 31 mars

/** Nombre maximum de jours dans un mois (sans contexte d'année — fév = 28). */
fun maxDayForMonth(month: Int): Int = when (month) {
    1, 3, 5, 7, 8, 10, 12 -> 31
    2 -> 28 // pas de gestion bissextile sur des dates récurrentes
    else -> 30 // avr, juin, sept, nov
}

/**
 * Encodage compact mois+jour pour comparaisons.
 * Fonctionne tant que day ∈ [1,31] et month ∈ [1,12].
 * Exemple : 15 oct → 1015, 15 avr → 415.
 */
private fun encode(month: Int, day: Int): Int = month * 100 + day

private fun encode(bound: SeasonBound): Int = encode(bound.month, bound.day)

/**
 * Retourne true si [date] est dans la fenêtre hors-saison.
 *
 * Deux cas supportés :
 *  - Fenêtre croise le 31 déc (start.month > end.month, ex. oct→avr) :
 *      current >= start  OU  current <= end
 *  - Fenêtre dans l'année (start.month < end.month, ex. jan→juin) :
 *      current >= start  ET  current <= end
 *  - start == end : toute l'année est hors-saison (cas dégénéré).
 */
fun isOffSeason(
    date: LocalDate = LocalDate.now(),
    start: SeasonBound = OFFSEASON_START,
    end: SeasonBound = OFFSEASON_END,
): Boolean {
    val current = encode(date.monthValue, date.dayOfMonth)
    val s = encode(start)
    val e = encode(end)

    if (s == e) return true // dégénéré — toute l'année

    return if (s > e) {
        // Croise le 31 déc (cas nominal : oct → avr)
        current >= s || current <= e
    } else {
        // Fenêtre dans l'année (ex : jan → juin)
        current in s..e
    }
}

/**
 * Retourne la prochaine date de changement de saison.
 *
 * - En été (hibernation)  → prochaine date START (entrée en hors-saison)
 * - En hors-saison        → prochaine date END   (entrée en hibernation)
 *
 * "Prochaine occurrence" = cette année si la date n'est pas encore passée,
 * sinon l'année suivante.
 */
fun nextSeasonChangeDate(
    date: LocalDate = LocalDate.now(),
    start: SeasonBound = OFFSEASON_START,
    end: SeasonBound = OFFSEASON_END,
): LocalDate {
    val today = encode(date.monthValue, date.dayOfMonth)

    val target = if (isOffSeason(date, start, end)) end else start
    var candidate = LocalDate.of(date.year, target.month, target.day)
    // Avancer d'un an seulement si la date cible est strictement dans le passé aujourd'hui
    if (encode(target) < today) {
        candidate = candidate.plusYears(1)
    }
    return candidate
}

/**
 * Retourne true si la configuration start/end est potentiellement problématique.
 * Cas dégénéré : start == end → toute l'année serait hors-saison.
 */
fun isDegenerate(start: SeasonBound, end: SeasonBound): Boolean =
    encode(start) == encode(end)
