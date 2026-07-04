package com.almostblue.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.Spacing

/** Étoile favori ★/☆ — port de spec/src/components/FavoriteButton.tsx. */
@Composable
fun FavoriteButton(
    isFav: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Text(
        text = if (isFav) "★" else "☆",
        fontSize = 24.sp,
        color = if (isFav) AppTheme.colors.warning else AppTheme.colors.textDisabled,
        modifier = modifier
            .clickable(onClick = onToggle)
            .padding(horizontal = Spacing.sm),
    )
}
