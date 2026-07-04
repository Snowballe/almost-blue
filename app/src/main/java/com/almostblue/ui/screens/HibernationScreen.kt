package com.almostblue.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.almostblue.domain.SeasonBound
import com.almostblue.domain.nextSeasonChangeDate
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val RETURN_DATE_FORMAT =
    DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRENCH)

/** Écran d'hibernation estivale — port de spec/src/screens/HibernationScreen.tsx. */
@Composable
fun HibernationScreen(
    offseasonStart: SeasonBound,
    offseasonEnd: SeasonBound,
    onOverride: () -> Unit,
) {
    val colors = AppTheme.colors
    val returnDate = nextSeasonChangeDate(LocalDate.now(), offseasonStart, offseasonEnd)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = Spacing.xxl),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("🌙", fontSize = 56.sp)
            Spacer(Modifier.height(Spacing.lg))
            Text(
                "Almost Blue",
                fontSize = FontSize.xxl,
                color = colors.textPrimary,
                letterSpacing = 1.sp,
            )
            Spacer(Modifier.height(Spacing.xs))
            Text("en hibernation estivale", fontSize = FontSize.lg, color = colors.textMuted)
            Spacer(Modifier.height(Spacing.xxl))
            Text(
                "Les falaises sèchent vite,\nprofites-en !",
                fontSize = FontSize.md,
                color = colors.textMuted,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp,
            )
            Spacer(Modifier.height(Spacing.xxl))
            Box(
                Modifier
                    .fillMaxWidth(0.6f)
                    .height(1.dp)
                    .background(colors.border),
            )
            Spacer(Modifier.height(Spacing.xl))
            Text(
                "RETOUR EN HORS-SAISON :",
                fontSize = FontSize.sm,
                color = colors.textMuted,
                letterSpacing = 0.8.sp,
            )
            Spacer(Modifier.height(Spacing.sm))
            Text(
                RETURN_DATE_FORMAT.format(returnDate),
                fontSize = FontSize.lg,
                color = colors.accent,
            )
        }

        OutlinedButton(
            onClick = onOverride,
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = Spacing.lg)
                .padding(bottom = Spacing.xl),
        ) {
            Text("Voir quand même  →", fontSize = FontSize.md, color = colors.textMuted)
        }
    }
}
