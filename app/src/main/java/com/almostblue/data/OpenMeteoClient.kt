package com.almostblue.data

import com.almostblue.BuildConfig
import com.almostblue.domain.WeatherForecast
import com.almostblue.domain.buildForecast
import java.io.IOException
import java.util.Locale
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request

/**
 * Client Open-Meteo — port de spec/src/services/openMeteo.ts.
 * Cache mémoire 1h + déduplication des requêtes en vol, identiques au TS.
 * axios → OkHttp + kotlinx.serialization ; le fetcher et l'horloge sont
 * injectables (équivalent du mock axios + fake timers de Jest).
 */

private const val CACHE_TTL_MS = 60L * 60 * 1000 // 1h

// ── Parsing de la réponse ─────────────────────────────────────────────────────

@Serializable
private data class OpenMeteoResponse(val hourly: OpenMeteoHourlyDto? = null)

/** DTO tout-nullable : la validation (hourly.time présent) reste applicative, comme en TS. */
@Serializable
private data class OpenMeteoHourlyDto(
    val time: List<String>? = null,
    @SerialName("temperature_2m") val temperature2m: List<Double>? = null,
    @SerialName("windspeed_10m") val windspeed10m: List<Double>? = null,
    @SerialName("winddirection_10m") val winddirection10m: List<Double>? = null,
    val precipitation: List<Double>? = null,
    @SerialName("precipitation_probability") val precipitationProbability: List<Double>? = null,
    val weathercode: List<Int>? = null,
)

private val json = Json { ignoreUnknownKeys = true }

/** Valide que la réponse contient bien le champ attendu, puis la normalise. */
fun parseOpenMeteoResponse(body: String): OpenMeteoHourly {
    val hourly = json.decodeFromString<OpenMeteoResponse>(body).hourly
    val time = hourly?.time
        ?: throw IOException("Open-Meteo : réponse invalide (champ hourly.time absent)")
    return OpenMeteoHourly(
        time = time,
        temperature2m = hourly.temperature2m ?: emptyList(),
        windspeed10m = hourly.windspeed10m ?: emptyList(),
        winddirection10m = hourly.winddirection10m,
        precipitation = hourly.precipitation ?: emptyList(),
        precipitationProbability = hourly.precipitationProbability,
        weathercode = hourly.weathercode ?: emptyList(),
    )
}

// ── Fetch HTTP ────────────────────────────────────────────────────────────────

private val httpClient by lazy { OkHttpClient() }

/**
 * GET /v1/forecast — paramètres v1.3 + `past_days=2` : sans les heures passées,
 * le lookback de pluie récente (6h/24h, calculé sur les créneaux précédents du
 * forecast) était vide en début de journée — la pluie de la veille rendait
 * invisible l'humidité du calcaire SLOW. Les créneaux passés sont ensuite
 * exclus du scoring par le filtre `ts > nowMs` de getSubSectorSummary.
 */
suspend fun fetchForecastHttp(
    latitude: Double,
    longitude: Double,
    baseUrl: String = BuildConfig.OPEN_METEO_BASE_URL,
): OpenMeteoHourly = withContext(Dispatchers.IO) {
    val url = "$baseUrl/v1/forecast".toHttpUrl().newBuilder()
        .addQueryParameter("latitude", latitude.toString())
        .addQueryParameter("longitude", longitude.toString())
        .addQueryParameter(
            "hourly",
            "temperature_2m,windspeed_10m,winddirection_10m,precipitation,precipitation_probability,weathercode",
        )
        .addQueryParameter("forecast_days", "3")
        .addQueryParameter("past_days", "2")
        .addQueryParameter("timezone", "Europe/Paris")
        .build()

    httpClient.newCall(Request.Builder().url(url).build()).execute().use { response ->
        if (!response.isSuccessful) throw IOException("Open-Meteo : HTTP ${response.code}")
        parseOpenMeteoResponse(response.body?.string() ?: "")
    }
}

// ── Cache + déduplication ─────────────────────────────────────────────────────

class OpenMeteoClient(
    private val fetchHourly: suspend (latitude: Double, longitude: Double) -> OpenMeteoHourly =
        { lat, lon -> fetchForecastHttp(lat, lon) },
    private val nowMs: () -> Long = System::currentTimeMillis,
) {
    private data class CacheEntry(val forecast: WeatherForecast, val ts: Long)

    private val mutex = Mutex()
    private val cache = HashMap<String, CacheEntry>()

    // Évite les requêtes dupliquées si plusieurs appelants demandent le même
    // secteur avant que la première requête se termine.
    private val pending = HashMap<String, CompletableDeferred<WeatherForecast>>()

    suspend fun getCachedForecast(latitude: Double, longitude: Double): WeatherForecast {
        // Arrondi à 4 décimales (~11 m) pour que deux appels avec de légères
        // variations de float partagent le même cache. Locale.US : point décimal
        // garanti quel que soit le locale du device.
        val key = String.format(Locale.US, "%.4f,%.4f", latitude, longitude)

        var inFlight: CompletableDeferred<WeatherForecast>? = null
        var owned: CompletableDeferred<WeatherForecast>? = null
        mutex.withLock {
            // 1. Cache chaud → retour immédiat
            cache[key]?.let { if (nowMs() - it.ts < CACHE_TTL_MS) return it.forecast }
            // 2. Requête déjà en vol pour ce secteur → partager le même résultat
            val existing = pending[key]
            if (existing != null) {
                inFlight = existing
            } else {
                // 3. Cette coroutine devient responsable du fetch
                owned = CompletableDeferred<WeatherForecast>().also { pending[key] = it }
            }
        }
        // Attendre HORS du mutex : le propriétaire en a besoin pour publier.
        inFlight?.let { return it.await() }
        val own = owned!!

        try {
            val forecast = buildForecast(fetchHourly(latitude, longitude))
            mutex.withLock { cache[key] = CacheEntry(forecast, nowMs()) }
            own.complete(forecast)
            return forecast
        } catch (e: Throwable) {
            own.completeExceptionally(e)
            throw e
        } finally {
            mutex.withLock { pending.remove(key) }
        }
    }
}
