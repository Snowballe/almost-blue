package com.almostblue.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.almostblue.AppGraph
import androidx.compose.ui.platform.LocalContext
import com.almostblue.data.SubSector
import com.almostblue.domain.GoodWindow
import com.almostblue.domain.WeatherForecast
import com.almostblue.domain.WeatherScore
import com.almostblue.domain.formatRelativeAge
import com.almostblue.domain.getSubSectorSummary
import com.almostblue.domain.label
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing
import com.almostblue.ui.theme.scoreGradientColor
import com.almostblue.ui.theme.scoreOnGradientColor
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val SCORE_LABEL = mapOf(
    WeatherScore.GOOD to "Sec",
    WeatherScore.OK to "Incertain",
    WeatherScore.BAD to "Humide",
)

private val WINDOW_DAY_FORMAT = DateTimeFormatter.ofPattern("EEE d", Locale.FRENCH)

/** « ven. 15 14h–17h » — port du formatWindow de SectorDetailScreen.tsx. */
private fun formatWindow(w: GoodWindow?): String? {
    if (w == null) return null
    val day = WINDOW_DAY_FORMAT.format(LocalDate.parse(w.date))
    return if (w.startHour == w.endHour) {
        "$day ${w.startHour}h"
    } else {
        "$day ${w.startHour}h–${w.endHour}h"
    }
}

private sealed interface ForecastState {
    data object Loading : ForecastState
    data object Error : ForecastState
    data class Ready(val forecast: WeatherForecast) : ForecastState
}

/** Une demande de chargement : [n] force la relance, [force] bypasse le TTL du cache. */
private data class LoadRequest(val n: Int = 0, val force: Boolean = false)

/** Détail d'un secteur : méta + météo 72h par sous-secteur — port de SectorDetailScreen.tsx. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SectorDetailScreen(sectorId: String) {
    val colors = AppTheme.colors
    val sector = remember(sectorId) { com.almostblue.data.sectors.find { it.id == sectorId } }

    if (sector == null) {
        Column(Modifier.fillMaxSize().background(colors.background)) {
            Text(
                "Secteur introuvable.",
                color = colors.danger,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(Spacing.lg),
            )
        }
        return
    }

    val graph = AppGraph.get(LocalContext.current)
    var request by remember { mutableStateOf(LoadRequest()) }
    var isRefreshing by remember { mutableStateOf(false) }
    val state by produceState<ForecastState>(ForecastState.Loading, sector.id, request) {
        // Pull-to-refresh : on garde le contenu affiché, l'indicateur suffit.
        if (!request.force) value = ForecastState.Loading
        value = try {
            ForecastState.Ready(
                graph.openMeteo.getCachedForecast(
                    sector.latitude, sector.longitude, forceRefresh = request.force,
                ),
            )
        } catch (_: Exception) {
            ForecastState.Error
        }
        isRefreshing = false
    }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = {
            isRefreshing = true
            request = LoadRequest(n = request.n + 1, force = true)
        },
        modifier = Modifier.fillMaxSize(),
    ) {
    Column(
        Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .padding(bottom = Spacing.xxxl),
    ) {
        // Bloc méta
        Column(
            Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(Spacing.lg),
        ) {
            if (sector.altitude != null) {
                Text("Altitude : ${sector.altitude}m", fontSize = FontSize.sm, color = colors.textMuted)
            }
            Text(
                "%.4f°N, %.4f°E".format(Locale.US, sector.latitude, sector.longitude),
                fontSize = FontSize.sm,
                color = colors.textMuted,
            )
            if (sector.notes != null) {
                Text(
                    sector.notes,
                    fontSize = FontSize.sm,
                    color = colors.textMuted,
                    modifier = Modifier.padding(top = Spacing.sm),
                )
            }
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)

        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth().padding(
                start = Spacing.lg, end = Spacing.lg, top = Spacing.xl, bottom = Spacing.sm,
            ),
        ) {
            Text(
                "Sous-secteurs — météo 72h",
                fontSize = FontSize.xs,
                fontWeight = FontWeight.SemiBold,
                color = colors.textMuted,
            )
            (state as? ForecastState.Ready)?.let { ready ->
                Text(
                    remember(ready) {
                        formatRelativeAge(ready.forecast.fetchedAt, System.currentTimeMillis())
                    },
                    fontSize = FontSize.xs,
                    color = colors.textMuted,
                )
            }
        }

        when (val s = state) {
            ForecastState.Loading -> CircularProgressIndicator(
                color = colors.accent,
                modifier = Modifier
                    .padding(top = Spacing.xl)
                    .align(Alignment.CenterHorizontally),
            )
            ForecastState.Error -> {
                Text(
                    "Météo indisponible.",
                    color = colors.danger,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(Spacing.lg),
                )
                Text(
                    "Réessayer",
                    fontSize = FontSize.sm,
                    color = colors.textMuted,
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .border(1.dp, colors.border, RoundedCornerShape(8.dp))
                        .clickable { request = LoadRequest(n = request.n + 1) }
                        .padding(horizontal = Spacing.lg, vertical = Spacing.sm),
                )
                SubSectorRows(sector.subSectors, forecast = null)
            }
            is ForecastState.Ready -> SubSectorRows(sector.subSectors, s.forecast)
        }
    }
    }
}

@Composable
private fun SubSectorRows(subSectors: List<SubSector>, forecast: WeatherForecast?) {
    for (ss in subSectors) {
        SubSectorRow(ss, forecast)
    }
}

@Composable
private fun SubSectorRow(subSector: SubSector, forecast: WeatherForecast?) {
    val colors = AppTheme.colors
    val summary = forecast?.let {
        getSubSectorSummary(it, subSector.orientation, subSector.rockType)
    }
    val window = summary?.let { formatWindow(it.nextGoodWindow) }

    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(horizontal = Spacing.lg, vertical = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    subSector.name,
                    fontSize = FontSize.md,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textPrimary,
                )
                if (window != null && summary.score == WeatherScore.GOOD) {
                    Text(window, fontSize = FontSize.sm, color = colors.good, modifier = Modifier.padding(top = 2.dp))
                }
                if (subSector.notes != null) {
                    Text(
                        subSector.notes,
                        fontSize = FontSize.sm,
                        color = colors.textMuted,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(subSector.orientation.label, fontSize = FontSize.sm, color = colors.textMuted)
                if (summary != null) {
                    Text(
                        "${SCORE_LABEL[summary.score]} · ${"%.1f".format(Locale.FRENCH, summary.numericScore)}/10",
                        fontSize = FontSize.sm,
                        fontWeight = FontWeight.SemiBold,
                        color = scoreOnGradientColor(summary.numericScore, colors),
                        modifier = Modifier
                            .padding(top = Spacing.xs)
                            .background(scoreGradientColor(summary.numericScore), RoundedCornerShape(6.dp))
                            .padding(horizontal = Spacing.sm, vertical = 3.dp),
                    )
                } else {
                    Text(
                        "—",
                        fontSize = FontSize.sm,
                        color = colors.background,
                        modifier = Modifier
                            .padding(top = Spacing.xs)
                            .background(colors.border, RoundedCornerShape(6.dp))
                            .padding(horizontal = Spacing.sm, vertical = 3.dp),
                    )
                }
            }
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}
