package com.trolyrobot.ai.ui.components

import androidx.compose.animation.core.InfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Sparkles
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trolyrobot.ai.data.ConnectionState
import com.trolyrobot.ai.data.VoiceOption
import com.trolyrobot.ai.ui.theme.Emerald400
import com.trolyrobot.ai.ui.theme.Emerald500
import com.trolyrobot.ai.ui.theme.Indigo400
import com.trolyrobot.ai.ui.theme.Indigo500
import com.trolyrobot.ai.ui.theme.Rose500
import com.trolyrobot.ai.ui.theme.Slate200
import com.trolyrobot.ai.ui.theme.Slate400
import com.trolyrobot.ai.ui.theme.Slate700
import com.trolyrobot.ai.ui.theme.Slate800
import com.trolyrobot.ai.ui.theme.Slate900
import kotlin.math.sin

private const val USER_SPEAKING_THRESHOLD = 0.08f

@Composable
fun VoiceVisualizerView(
    connectionState: ConnectionState,
    selectedVoice: VoiceOption,
    userVolume: Float,
    aiVolume: Float,
    isRecording: Boolean,
    isAiSpeaking: Boolean
) {
    val transition: InfiniteTransition = rememberInfiniteTransition(label = "ring_anim")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = (2 * Math.PI).toFloat(),
        animationSpec = infiniteRepeatable(animation = tween(2000)),
        label = "phase"
    )

    val activeVolume = if (isAiSpeaking) aiVolume else if (isRecording) userVolume else 0.05f
    val mainColor = if (isAiSpeaking) Indigo400 else if (isRecording) Emerald400 else Slate400

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(Slate900.copy(alpha = 0.9f))
            .border(1.dp, Slate800, RoundedCornerShape(20.dp))
            .padding(12.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // Status Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (connectionState == ConnectionState.CONNECTED) Emerald400 else Rose500)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (connectionState == ConnectionState.CONNECTED) "WEBSOCKETS LIVE" else "DISCONNECTED",
                        color = Slate200,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Row(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Slate800)
                        .border(1.dp, Slate700, CircleShape)
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Sparkles,
                        contentDescription = "Voice",
                        tint = Indigo400,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Giọng AI: ${selectedVoice.voiceName}",
                        color = Indigo400,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Canvas & Center Icon
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.size(130.dp)) {
                    val center = Offset(size.width / 2, size.height / 2)
                    val baseRadius = 40f

                    for (i in 1..3) {
                        val pulse = sin(phase * 2 + i) * 6f * activeVolume
                        val radius = baseRadius + i * 14f + pulse * 10f

                        drawCircle(
                            color = mainColor.copy(alpha = 0.3f / i),
                            radius = radius,
                            center = center,
                            style = Stroke(width = 2f)
                        )
                    }

                    drawCircle(
                        color = mainColor.copy(alpha = 0.2f),
                        radius = baseRadius + (activeVolume * 15f),
                        center = center
                    )
                }

                // Center Icon State
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    if (isAiSpeaking) {
                        Icon(
                            imageVector = Icons.Default.VolumeUp,
                            contentDescription = "AI Speaking",
                            tint = Indigo400,
                            modifier = Modifier.size(32.dp)
                        )
                        Text(
                            text = "AI ĐANG NÓI",
                            color = Indigo400,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    } else if (isRecording && userVolume > USER_SPEAKING_THRESHOLD) {
                        Icon(
                            imageVector = Icons.Default.Mic,
                            contentDescription = "User Speaking",
                            tint = Emerald400,
                            modifier = Modifier.size(32.dp)
                        )
                        Text(
                            text = "BẠN ĐANG NÓI",
                            color = Emerald400,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    } else if (isRecording) {
                        Icon(
                            imageVector = Icons.Default.Mic,
                            contentDescription = "Listening",
                            tint = Slate200,
                            modifier = Modifier.size(32.dp)
                        )
                        Text(
                            text = "ĐANG NGHE...",
                            color = Slate200,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Medium
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.GraphicEq,
                            contentDescription = "Ready",
                            tint = Slate400,
                            modifier = Modifier.size(28.dp)
                        )
                        Text(
                            text = "SẴN SÀNG",
                            color = Slate400,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Realtime Equalizer Bars
            Row(
                horizontalArrangement = Arrangement.spacedBy(3.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.height(18.dp)
            ) {
                repeat(14) { index ->
                    val factor = sin((index / 14f) * Math.PI).toFloat() * activeVolume
                    val barHeight = (4 + factor * 20).coerceIn(4f, 18f).dp

                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(barHeight)
                            .clip(CircleShape)
                            .background(mainColor)
                    )
                }
            }
        }
    }
}
