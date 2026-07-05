package com.almostblue.data

/**
 * Bloc `hourly` de la réponse Open-Meteo — port de l'interface OpenMeteoHourly
 * de spec/src/services/openMeteo.ts. Les champs optionnels côté API restent
 * nullables ; buildForecast retombe sur 0 en leur absence.
 */
data class OpenMeteoHourly(
    val time: List<String>,
    val temperature2m: List<Double>,
    val windspeed10m: List<Double>,
    val winddirection10m: List<Double>? = null,
    val precipitation: List<Double>,
    val precipitationProbability: List<Double>? = null,
    val weathercode: List<Int>,
)
