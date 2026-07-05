package com.almostblue.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Favoris — remplace useSectorsStore.ts. Seuls les IDs sont persistés.
 * Stockés en string jointe (les IDs de secteurs ne contiennent pas de virgule)
 * pour préserver l'ordre d'insertion, comme le tableau JSON de la v1.3.
 */
class SectorsRepository(private val dataStore: DataStore<Preferences>) {

    private val favoritesKey = stringPreferencesKey("favoriteIds")

    val favoriteIds: Flow<List<String>> = dataStore.data.map { p ->
        p[favoritesKey]?.takeIf { it.isNotEmpty() }?.split(',') ?: emptyList()
    }

    /** Ajout/retrait atomique dans un seul edit, comme le set() unique de Zustand. */
    suspend fun toggleFavorite(id: String) = dataStore.edit { p ->
        val current = p[favoritesKey]?.takeIf { it.isNotEmpty() }?.split(',') ?: emptyList()
        val next = if (id in current) current - id else current + id
        p[favoritesKey] = next.joinToString(",")
    }
}
