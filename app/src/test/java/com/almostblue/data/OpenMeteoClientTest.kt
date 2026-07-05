package com.almostblue.data

import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * Port 1:1 de spec/__tests__/services/openMeteo.test.ts.
 * Le mock axios devient un fetcher injecté ; les fake timers, une horloge injectée.
 */
class OpenMeteoClientTest {

    private val cacheTtlMs = 60L * 60 * 1000 // 1h, doit correspondre à OpenMeteoClient

    // Données hourly minimales valides pour buildForecast
    private val mockHourly = OpenMeteoHourly(
        time = listOf("2026-06-01T00:00", "2026-06-01T01:00", "2026-06-01T02:00"),
        temperature2m = listOf(15.0, 16.0, 14.0),
        windspeed10m = listOf(10.0, 12.0, 8.0),
        precipitation = listOf(0.0, 0.0, 0.0),
        weathercode = listOf(0, 0, 0),
    )

    /** Fetcher factice : compte les appels et enregistre les coordonnées reçues. */
    private class FakeFetcher(private val hourly: OpenMeteoHourly) {
        var callCount = 0
        var lastLatitude: Double? = null
        var lastLongitude: Double? = null

        suspend fun fetch(lat: Double, lon: Double): OpenMeteoHourly {
            callCount++
            lastLatitude = lat
            lastLongitude = lon
            return hourly
        }
    }

    // ── premier appel ───────────────────────────────────────────────────────────

    @Test
    fun `appelle le fetcher et retourne un forecast`() = runTest {
        val fetcher = FakeFetcher(mockHourly)
        val client = OpenMeteoClient(fetchHourly = fetcher::fetch)
        val forecast = client.getCachedForecast(10.0, 10.0)
        assertEquals(1, fetcher.callCount)
        assertNotNull(forecast)
        assertEquals(3, forecast.slots.size)
    }

    @Test
    fun `passe les bonnes coordonnees au fetcher`() = runTest {
        val fetcher = FakeFetcher(mockHourly)
        val client = OpenMeteoClient(fetchHourly = fetcher::fetch)
        client.getCachedForecast(48.7166, 2.3001)
        assertEquals(48.7166, fetcher.lastLatitude!!, 1e-9)
        assertEquals(2.3001, fetcher.lastLongitude!!, 1e-9)
    }

    // ── cache hit ───────────────────────────────────────────────────────────────

    @Test
    fun `deuxieme appel identique ne rappelle pas le fetcher (cache sous 1h)`() = runTest {
        val fetcher = FakeFetcher(mockHourly)
        val client = OpenMeteoClient(fetchHourly = fetcher::fetch)
        val f1 = client.getCachedForecast(11.0, 11.0)
        val f2 = client.getCachedForecast(11.0, 11.0)
        assertEquals(1, fetcher.callCount)
        assertSame(f1, f2) // même référence objet
    }

    // ── cache expiration ────────────────────────────────────────────────────────

    @Test
    fun `recharge apres 1h+1ms`() = runTest {
        var now = 0L
        val fetcher = FakeFetcher(mockHourly)
        val client = OpenMeteoClient(fetchHourly = fetcher::fetch, nowMs = { now })
        client.getCachedForecast(12.0, 12.0)
        now += cacheTtlMs + 1
        client.getCachedForecast(12.0, 12.0)
        assertEquals(2, fetcher.callCount)
    }

    @Test
    fun `ne recharge pas juste avant expiration (1h-1ms)`() = runTest {
        var now = 0L
        val fetcher = FakeFetcher(mockHourly)
        val client = OpenMeteoClient(fetchHourly = fetcher::fetch, nowMs = { now })
        client.getCachedForecast(13.0, 13.0)
        now += cacheTtlMs - 1
        client.getCachedForecast(13.0, 13.0)
        assertEquals(1, fetcher.callCount)
    }

    // ── déduplication des requêtes en vol ───────────────────────────────────────

    @Test
    fun `deux appels simultanes partagent une seule requete`() = runTest {
        var callCount = 0
        val gate = CompletableDeferred<OpenMeteoHourly>()
        val client = OpenMeteoClient(fetchHourly = { _, _ ->
            callCount++
            gate.await() // requête « en vol » tant que le test ne la libère pas
        })

        val p1 = async { client.getCachedForecast(14.0, 14.0) }
        val p2 = async { client.getCachedForecast(14.0, 14.0) } // doit réutiliser la requête en vol
        yield() // laisser les deux coroutines atteindre le fetch/l'attente

        gate.complete(mockHourly)

        val f1 = p1.await()
        val f2 = p2.await()
        assertEquals(1, callCount)
        assertSame(f1, f2)
    }

    // ── normalisation de la clé de cache ────────────────────────────────────────

    @Test
    fun `coordonnees legerement differentes partagent le meme cache (4 decimales)`() = runTest {
        val fetcher = FakeFetcher(mockHourly)
        val client = OpenMeteoClient(fetchHourly = fetcher::fetch)
        client.getCachedForecast(48.71664799, 2.30001) // arrondi → 48.7166,2.3000
        client.getCachedForecast(48.7166, 2.3000)      // même clé
        assertEquals(1, fetcher.callCount)
    }

    // ── réponse invalide ────────────────────────────────────────────────────────

    @Test
    fun `leve une erreur si hourly-time est absent`() {
        try {
            parseOpenMeteoResponse("""{"hourly":{}}""")
            fail("aurait dû lever une IOException")
        } catch (e: IOException) {
            assertTrue(e.message!!.contains("Open-Meteo"))
        }
    }
}
