package com.almostblue.domain

import java.time.ZoneId

/**
 * Fuseau de référence de l'app — l'API Open-Meteo est interrogée en heure de
 * Paris et la dédup du digest raisonne en jour calendaire parisien (parité v1.3).
 */
val PARIS_ZONE: ZoneId = ZoneId.of("Europe/Paris")
