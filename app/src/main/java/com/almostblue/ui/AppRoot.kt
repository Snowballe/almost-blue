package com.almostblue.ui

import android.app.NotificationManager
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Terrain
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.almostblue.AppGraph
import com.almostblue.data.ColorScheme
import com.almostblue.data.Settings
import com.almostblue.data.sectors
import com.almostblue.domain.isOffSeason
import com.almostblue.notifications.getReliabilityStatus
import com.almostblue.notifications.isReliabilityOk
import com.almostblue.notifications.requestBatteryOptimizationExemption
import com.almostblue.ui.screens.HibernationScreen
import com.almostblue.ui.screens.SectorDetailScreen
import com.almostblue.ui.screens.SectorListScreen
import com.almostblue.ui.screens.SettingsScreen
import com.almostblue.ui.theme.AlmostBlueTheme
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing
import java.time.LocalDate
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Racine de l'app — port d'AppNavigator.tsx : thème piloté par les réglages,
 * gate d'hibernation estivale (avec reset auto de l'override au retour en
 * hors-saison), onglets Secteurs/Carte/Réglages + écran détail.
 */
@Composable
fun AppRoot() {
    val graph = AppGraph.get(LocalContext.current)
    val settings by graph.settingsRepo.settings.collectAsState(initial = null)
    val s = settings ?: return // fond du thème système pendant l'hydratation, comme la v1.3

    AlmostBlueTheme(dark = s.colorScheme == ColorScheme.DARK) {
        val scope = rememberCoroutineScope()
        val inOffSeason = isOffSeason(LocalDate.now(), s.offseasonStart, s.offseasonEnd)

        ReliabilityPromptOnce()

        // Override persisté : il se réinitialise automatiquement dès qu'on entre
        // en hors-saison, pour que l'écran réapparaisse la saison suivante.
        LaunchedEffect(inOffSeason, s.overrideHibernation) {
            if (inOffSeason && s.overrideHibernation) {
                graph.settingsRepo.setOverrideHibernation(false)
            }
        }

        val hibernating = s.hibernationEnabled && !inOffSeason && !s.overrideHibernation
        if (hibernating) {
            HibernationScreen(
                offseasonStart = s.offseasonStart,
                offseasonEnd = s.offseasonEnd,
                onOverride = { scope.launch { graph.settingsRepo.setOverrideHibernation(true) } },
            )
        } else {
            MainNavigation(s)
        }
    }
}

private data class TabSpec(val route: String, val label: String, val icon: ImageVector)

private val TABS = listOf(
    TabSpec("sectors", "Secteurs", Icons.Filled.Terrain),
    TabSpec("map", "Carte", Icons.Filled.Map),
    TabSpec("settings", "Réglages", Icons.Filled.Settings),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainNavigation(settings: Settings) {
    val colors = AppTheme.colors
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    val onTab = currentRoute in TABS.map { it.route }
    val detailSectorId = backStack?.arguments?.getString("sectorId")

    Scaffold(
        containerColor = colors.background,
        topBar = {
            when {
                currentRoute == "settings" -> AppTopBar("Réglages")
                currentRoute?.startsWith("sector/") == true -> AppTopBar(
                    sectors.find { it.id == detailSectorId }?.name ?: "Secteur",
                    onBack = { navController.popBackStack() },
                    sectorId = detailSectorId,
                )
            }
        },
        bottomBar = {
            if (onTab) {
                NavigationBar(containerColor = colors.surface) {
                    for (tab in TABS) {
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = colors.accent,
                                selectedTextColor = colors.accent,
                                unselectedIconColor = colors.textDisabled,
                                unselectedTextColor = colors.textDisabled,
                                indicatorColor = colors.surfaceHigh,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        val graph = AppGraph.get(LocalContext.current)
        val scope = rememberCoroutineScope()
        val favoriteIds by graph.sectorsRepo.favoriteIds.collectAsState(initial = emptyList())

        NavHost(
            navController = navController,
            startDestination = "sectors",
            modifier = Modifier.padding(padding),
        ) {
            composable("sectors") {
                SectorListScreen(
                    favoriteIds = favoriteIds,
                    onToggleFavorite = { id -> scope.launch { graph.sectorsRepo.toggleFavorite(id) } },
                    onOpenSector = { id -> navController.navigate("sector/$id") },
                )
            }
            composable("map") { MapPlaceholder() }
            composable("settings") { SettingsScreen(settings = settings) }
            composable("sector/{sectorId}") { entry ->
                SectorDetailScreen(sectorId = entry.arguments?.getString("sectorId") ?: "")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppTopBar(title: String, onBack: (() -> Unit)? = null, sectorId: String? = null) {
    val colors = AppTheme.colors
    val graph = AppGraph.get(LocalContext.current)
    val scope = rememberCoroutineScope()
    val favoriteIds by graph.sectorsRepo.favoriteIds.collectAsState(initial = emptyList())

    TopAppBar(
        title = { Text(title, fontWeight = FontWeight.SemiBold, color = colors.textPrimary) },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = colors.surface),
        navigationIcon = {
            if (onBack != null) {
                Text(
                    "←",
                    fontSize = FontSize.xl,
                    color = colors.textPrimary,
                    modifier = Modifier
                        .clickable { onBack() }
                        .padding(horizontal = Spacing.lg),
                )
            }
        },
        actions = {
            if (sectorId != null) {
                com.almostblue.ui.components.FavoriteButton(
                    isFav = sectorId in favoriteIds,
                    onToggle = { scope.launch { graph.sectorsRepo.toggleFavorite(sectorId) } },
                    modifier = Modifier.padding(end = Spacing.md),
                )
            }
        },
    )
}

/** Provisoire M5. */
@Composable
private fun MapPlaceholder() {
    Column(
        Modifier.fillMaxSize().background(AppTheme.colors.background),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Carte MapLibre — M5", color = AppTheme.colors.textMuted, fontSize = FontSize.md)
    }
}

/**
 * Invite unique de fiabilité — parité useNotificationSetup v1.3 : sans exemption
 * batterie / alarmes exactes, le digest ne part pas à l'heure pile. On ne la
 * montre qu'une fois (reliabilityPromptDone) ; la section « Fiabilité » des
 * réglages reste accessible. Si la permission de notifier n'est pas (encore)
 * accordée, on réessaiera au prochain lancement.
 */
@Composable
private fun ReliabilityPromptOnce() {
    val context = LocalContext.current
    val graph = AppGraph.get(context)
    var showPrompt by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        if (!notificationManager.areNotificationsEnabled()) return@LaunchedEffect

        val settings = graph.settingsRepo.settings.first()
        if (settings.reliabilityPromptDone) return@LaunchedEffect
        if (isReliabilityOk(getReliabilityStatus(context))) return@LaunchedEffect

        graph.settingsRepo.setReliabilityPromptDone(true)
        showPrompt = true
    }

    if (showPrompt) {
        val colors = AppTheme.colors
        AlertDialog(
            onDismissRequest = { showPrompt = false },
            containerColor = colors.surface,
            titleContentColor = colors.textPrimary,
            textContentColor = colors.textMuted,
            title = { Text("Notifications à l’heure") },
            text = {
                Text(
                    "Pour recevoir le résumé quotidien à l’heure pile même app fermée, " +
                        "autorise Almost Blue à ignorer l’optimisation de batterie.",
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showPrompt = false
                    requestBatteryOptimizationExemption(context)
                }) {
                    Text("Autoriser", color = colors.accent)
                }
            },
            dismissButton = {
                TextButton(onClick = { showPrompt = false }) {
                    Text("Plus tard", color = colors.textMuted)
                }
            },
        )
    }
}
