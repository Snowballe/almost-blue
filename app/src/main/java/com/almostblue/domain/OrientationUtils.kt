package com.almostblue.domain

/** Port de spec/src/utils/orientationUtils.ts. */

/** Affichage court avec flèche directionnelle — pour l'UI (badge, liste). */
val Orientation.label: String
    get() = when (this) {
        Orientation.N -> "↑ N"
        Orientation.NE -> "↗ NE"
        Orientation.E -> "→ E"
        Orientation.SE -> "↘ SE"
        Orientation.S -> "↓ S"
        Orientation.SW -> "↙ SW"
        Orientation.W -> "← W"
        Orientation.NW -> "↖ NW"
    }

/** Nom complet en français — pour les messages de notification. */
val Orientation.frenchName: String
    get() = when (this) {
        Orientation.N -> "Nord"
        Orientation.NE -> "Nord-Est"
        Orientation.E -> "Est"
        Orientation.SE -> "Sud-Est"
        Orientation.S -> "Sud"
        Orientation.SW -> "Sud-Ouest"
        Orientation.W -> "Ouest"
        Orientation.NW -> "Nord-Ouest"
    }
