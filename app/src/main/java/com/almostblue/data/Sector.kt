package com.almostblue.data

import com.almostblue.domain.Orientation
import com.almostblue.domain.RockType

/** Port de spec/src/types/sector.ts. */

data class SubSector(
    val id: String,
    val name: String,
    /** L'orientation appartient au sous-secteur (même falaise = même orientation). */
    val orientation: Orientation,
    /** Pilote la fenêtre de pluie récente (6h vs 24h) et sa sévérité. */
    val rockType: RockType,
    val notes: String? = null,
)

data class Sector(
    val id: String,
    val name: String,
    /** GPS partagé par tous les sous-secteurs (un seul appel météo par secteur). */
    val latitude: Double,
    val longitude: Double,
    val altitude: Int? = null,
    val notes: String? = null,
    val subSectors: List<SubSector>,
)
