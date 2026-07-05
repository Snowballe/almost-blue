package com.almostblue.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.almostblue.AppGraph
import com.almostblue.data.Sector
import com.almostblue.data.sectors
import com.almostblue.domain.getSubSectorSummary
import com.almostblue.ui.components.FavoriteButton
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing
import com.almostblue.ui.theme.scoreGradientColor
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.plugins.annotation.Circle
import org.maplibre.android.plugins.annotation.CircleManager
import org.maplibre.android.plugins.annotation.CircleOptions
import org.maplibre.android.utils.ColorUtils

private val SHEET_HEIGHT = 460.dp
private val FRANCE_CENTER = LatLng(46.5, 2.3)

/** Style raster OSM sans clé — équivalent de l'OSM_STYLE de MapScreen.tsx. */
private const val OSM_STYLE_JSON = """
{
  "version": 8,
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "tileSize": 256,
      "attribution": "© OpenStreetMap contributors"
    }
  },
  "layers": [{"id": "osm", "type": "raster", "source": "osm"}]
}
"""

/**
 * Carte des secteurs — port de MapScreen.tsx. Pins = cercles 18dp à bord blanc
 * (CircleManager, l'équivalent natif des ViewAnnotation RN), colorés par le
 * meilleur score des sous-secteurs. Panneau glissant : spring à l'ouverture,
 * timing 220 ms à la fermeture, overlay 40 %.
 */
@Composable
fun MapScreen(onOpenSector: (String) -> Unit) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    val graph = AppGraph.get(context)
    val scope = rememberCoroutineScope()
    val sheetHeightPx = with(LocalDensity.current) { SHEET_HEIGHT.toPx() }

    var selected by remember { mutableStateOf<Sector?>(null) }
    var sheetVisible by remember { mutableStateOf(false) }
    /** 0 = panneau ouvert, 1 = replié sous l'écran (fraction de SHEET_HEIGHT). */
    val slide = remember { Animatable(1f) }

    var pinColors by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var circles by remember { mutableStateOf<Map<String, Circle>>(emptyMap()) }
    var circleManager by remember { mutableStateOf<CircleManager?>(null) }

    val openSheet: (Sector) -> Unit = { sector ->
        selected = sector
        sheetVisible = true
        scope.launch {
            // Approximation Compose du spring RN bounciness=4 (léger rebond).
            slide.animateTo(0f, spring(dampingRatio = 0.85f, stiffness = 380f))
        }
    }
    val currentOpenSheet by rememberUpdatedState(openSheet)

    fun closeSheet(then: (() -> Unit)? = null) {
        scope.launch {
            slide.animateTo(1f, tween(durationMillis = 220))
            sheetVisible = false
            selected = null
            then?.invoke()
        }
    }

    // Couleur des pins : toutes les requêtes en parallèle, une seule mise à
    // jour d'état à la fin ; une erreur réseau sur un secteur n'annule pas les
    // autres (équivalent du Promise.allSettled de la v1.3).
    LaunchedEffect(Unit) {
        pinColors = supervisorScope {
            sectors.map { sector ->
                async {
                    runCatching {
                        val forecast =
                            graph.openMeteo.getCachedForecast(sector.latitude, sector.longitude)
                        val best = sector.subSectors.maxOf { ss ->
                            getSubSectorSummary(forecast, ss.orientation, ss.rockType).numericScore
                        }
                        sector.id to scoreGradientColor(best).toArgb()
                    }.getOrNull()
                }
            }.awaitAll().filterNotNull().toMap()
        }
    }

    // Applique les couleurs une fois pins ET météo disponibles (ordre libre).
    LaunchedEffect(pinColors, circles) {
        val manager = circleManager ?: return@LaunchedEffect
        if (circles.isEmpty() || pinColors.isEmpty()) return@LaunchedEffect
        for ((id, circle) in circles) {
            pinColors[id]?.let { circle.circleColor = ColorUtils.colorToRgbaString(it) }
        }
        manager.update(circles.values.toList())
    }

    val accentRgba = ColorUtils.colorToRgbaString(colors.accent.toArgb())
    val whiteRgba = ColorUtils.colorToRgbaString(colors.white.toArgb())

    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context).apply { onCreate(null) }
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapView.onDestroy()
        }
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = {
                mapView.apply {
                    getMapAsync { map ->
                        map.cameraPosition = CameraPosition.Builder()
                            .target(FRANCE_CENTER)
                            .zoom(5.0)
                            .build()
                        map.setStyle(Style.Builder().fromJson(OSM_STYLE_JSON)) { style ->
                            val manager = CircleManager(this, map, style)
                            val created = sectors.associate { sector ->
                                sector.id to manager.create(
                                    CircleOptions()
                                        .withLatLng(LatLng(sector.latitude, sector.longitude))
                                        .withCircleRadius(9f)
                                        .withCircleColor(accentRgba)
                                        .withCircleStrokeColor(whiteRgba)
                                        .withCircleStrokeWidth(2.5f),
                                )
                            }
                            manager.addClickListener { circle ->
                                created.entries.find { it.value.id == circle.id }
                                    ?.let { (id, _) ->
                                        sectors.find { it.id == id }
                                            ?.let(currentOpenSheet)
                                    }
                                true
                            }
                            circleManager = manager
                            circles = created
                        }
                    }
                }
            },
        )

        if (sheetVisible) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.4f))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { closeSheet() },
            )

            selected?.let { sector ->
                SectorSheet(
                    sector = sector,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .graphicsLayer { translationY = slide.value * sheetHeightPx },
                    onNavigateToDetail = {
                        // Capturer l'id AVANT la fermeture : closeSheet null-ifie
                        // `selected` à la fin de l'animation (même piège qu'en v1.3).
                        val sectorId = sector.id
                        closeSheet { onOpenSector(sectorId) }
                    },
                )
            }
        }
    }
}

@Composable
private fun SectorSheet(
    sector: Sector,
    modifier: Modifier = Modifier,
    onNavigateToDetail: () -> Unit,
) {
    val colors = AppTheme.colors
    val graph = AppGraph.get(LocalContext.current)
    val scope = rememberCoroutineScope()
    val favoriteIds by graph.sectorsRepo.favoriteIds.collectAsState(initial = emptyList())

    Column(
        modifier
            .fillMaxWidth()
            .height(SHEET_HEIGHT)
            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
            .background(colors.surface)
            // Consomme les taps pour qu'ils ne ferment pas le panneau via l'overlay.
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) {}
            .padding(start = Spacing.lg, end = Spacing.lg, bottom = Spacing.xl),
    ) {
        Box(
            Modifier
                .align(Alignment.CenterHorizontally)
                .padding(top = Spacing.sm)
                .width(36.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(colors.border),
        )

        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = Spacing.md, bottom = Spacing.xs),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                sector.name,
                fontSize = FontSize.lg,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .weight(1f)
                    .padding(end = Spacing.md),
            )
            FavoriteButton(
                isFav = sector.id in favoriteIds,
                onToggle = { scope.launch { graph.sectorsRepo.toggleFavorite(sector.id) } },
            )
        }

        if (sector.altitude != null) {
            Text(
                "${sector.altitude}m",
                fontSize = FontSize.sm,
                color = colors.textMuted,
                modifier = Modifier.padding(bottom = Spacing.md),
            )
        }

        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(bottom = Spacing.md),
        ) {
            for (ss in sector.subSectors) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = Spacing.sm),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(ss.name, fontSize = FontSize.md, color = colors.textPrimary)
                    Text(
                        ss.orientation.name,
                        fontSize = FontSize.md,
                        fontWeight = FontWeight.Medium,
                        color = colors.textMuted,
                    )
                }
                HorizontalDivider(color = colors.border, thickness = 1.dp)
            }
        }

        Text(
            "Voir le détail →",
            fontSize = FontSize.md,
            fontWeight = FontWeight.SemiBold,
            color = colors.white,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(colors.accent)
                .clickable(onClick = onNavigateToDetail)
                .padding(vertical = Spacing.md),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}
