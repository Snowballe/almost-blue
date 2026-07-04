package com.almostblue.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.almostblue.data.Sector
import com.almostblue.data.sectors
import com.almostblue.ui.components.FavoriteButton
import com.almostblue.ui.components.settings.SectionHeader
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing

/** Liste des secteurs (sections Favoris / Tous) — port de SectorListScreen.tsx. */
@Composable
fun SectorListScreen(
    favoriteIds: List<String>,
    onToggleFavorite: (String) -> Unit,
    onOpenSector: (String) -> Unit,
) {
    val favSet = favoriteIds.toSet()
    val favorites = sectors.filter { it.id in favSet }
    val others = sectors.filter { it.id !in favSet }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.background),
        contentPadding = PaddingValues(bottom = Spacing.xxxl),
    ) {
        if (favorites.isNotEmpty()) {
            item { SectionHeader("Favoris") }
            items(favorites.size) { i ->
                SectorRow(favorites[i], isFav = true, onToggleFavorite, onOpenSector)
            }
        }
        if (others.isNotEmpty()) {
            item { SectionHeader(if (favorites.isNotEmpty()) "Tous les secteurs" else "Secteurs") }
            items(others.size) { i ->
                SectorRow(others[i], isFav = false, onToggleFavorite, onOpenSector)
            }
        }
    }
}

@Composable
private fun SectorRow(
    sector: Sector,
    isFav: Boolean,
    onToggleFavorite: (String) -> Unit,
    onOpenSector: (String) -> Unit,
) {
    val colors = AppTheme.colors
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .clickable { onOpenSector(sector.id) }
                .padding(horizontal = Spacing.lg, vertical = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    sector.name,
                    fontSize = FontSize.md,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textPrimary,
                )
                val plural = if (sector.subSectors.size > 1) "s" else ""
                val altitude = sector.altitude?.let { " · ${it}m" } ?: ""
                Text(
                    "${sector.subSectors.size} sous-secteur$plural$altitude",
                    fontSize = FontSize.sm,
                    color = colors.textMuted,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
            FavoriteButton(
                isFav = isFav,
                onToggle = { onToggleFavorite(sector.id) },
                modifier = Modifier.padding(start = Spacing.md),
            )
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}
