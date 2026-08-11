package com.trolyrobot.ai.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = Indigo500,
    secondary = Emerald500,
    background = Slate950,
    surface = Slate900,
    onPrimary = Slate100,
    onSecondary = Slate100,
    onBackground = Slate100,
    onSurface = Slate100
)

@Composable
fun AiRealtimeVoiceChatTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
