package com.trolyrobot.ai.ui.components

import androidx.compose.animation.core.InfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Sparkles
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.ripple.rememberRipple
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trolyrobot.ai.data.ConnectionState
import com.trolyrobot.ai.data.VoiceOption
import com.trolyrobot.ai.ui.theme.Amber400
import com.trolyrobot.ai.ui.theme.Amber500
import com.trolyrobot.ai.ui.theme.Emerald400
import com.trolyrobot.ai.ui.theme.Emerald500
import com.trolyrobot.ai.ui.theme.Emerald600
import com.trolyrobot.ai.ui.theme.Indigo400
import com.trolyrobot.ai.ui.theme.Indigo500
import com.trolyrobot.ai.ui.theme.Indigo600
import com.trolyrobot.ai.ui.theme.Rose500
import com.trolyrobot.ai.ui.theme.Rose600
import com.trolyrobot.ai.ui.theme.Slate200
import com.trolyrobot.ai.ui.theme.Slate300
import com.trolyrobot.ai.ui.theme.Slate400
import com.trolyrobot.ai.ui.theme.Slate700
import com.trolyrobot.ai.ui.theme.Slate800
import com.trolyrobot.ai.ui.theme.Slate900
import kotlin.math.sin

@Composable
fun VoiceVisualizerView(
    connectionState: ConnectionState,
    selectedVoice: VoiceOption,
    userVolume: Float,
    aiVolume: Float,
    isRecording: Boolean,
    isAiSpeaking: Boolean,
    onToggleMic: () -> Unit,
    onReconnect: () -> Unit = {}
) {
    val transition: InfiniteTransition = rememberInfiniteTransition(label = "ring_anim")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = (2 * Math.PI).toFloat(),
        animationSpec = infiniteRepeatable(animation = tween(2000)),
        label = "phase"
    )

    val pulseScale by transition.animateFloat(
        initialValue = 1f,
        targetValue = if (isRecording) 1.09f else if (isAiSpeaking) 1.06f else 1.03f,
        animationSpec = infiniteRepeatable(animation = tween(800)),
        label = "pulse_scale"
    )

    val activeVolume = if (isAiSpeaking) aiVolume else if (isRecording) userVolume else 0.05f
    val mainColor = if (isAiSpeaking) Indigo400 else if (isRecording) Rose500 else Emerald400

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(Slate900.copy(alpha = 0.95f))
            .border(1.5.dp, if (isRecording) Rose500.copy(alpha = 0.5f) else if (isAiSpeaking) Indigo500.copy(alpha = 0.5f) else Slate800, RoundedCornerShape(24.dp))
            .padding(14.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // Status Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Connection State Indicator with Click-to-Reconnect
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(enabled = connectionState != ConnectionState.CONNECTED, onClick = onReconnect)
                        .padding(horizontal = 6.dp, vertical = 3.dp)
                ) {
                    val statusDotColor = when (connectionState) {
                        ConnectionState.CONNECTED -> Emerald400
                        ConnectionState.CONNECTING -> Amber400
                        else -> Rose500
                    }
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(statusDotColor)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = when (connectionState) {
                            ConnectionState.CONNECTED -> "LIVE • DUPLOID VOIP"
                            ConnectionState.CONNECTING -> "ĐANG KẾT NỐI LẠI..."
                            else -> "MẤT MẠNG • CHẠM ĐỂ THỬ LẠI"
                        },
                        color = when (connectionState) {
                            ConnectionState.CONNECTED -> Slate200
                            ConnectionState.CONNECTING -> Amber400
                            else -> Rose500
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }

                Row(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Slate800)
                        .border(1.dp, Slate700, CircleShape)
                        .padding(horizontal = 10.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Sparkles,
                        contentDescription = "Voice",
                        tint = Indigo400,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = selectedVoice.voiceName,
                        color = Indigo400,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Canvas & Center Interactive Ultra-Large Microphone Hub Button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(168.dp),
                contentAlignment = Alignment.Center
            ) {
                // Background Waves Canvas
                Canvas(modifier = Modifier.size(168.dp)) {
                    val center = Offset(size.width / 2, size.height / 2)
                    val baseRadius = 56f

                    for (i in 1..3) {
                        val pulse = sin(phase * 2 + i) * 8f * activeVolume
                        val radius = baseRadius + i * 16f + pulse * 12f

                        drawCircle(
                            color = mainColor.copy(alpha = 0.35f / i),
                            radius = radius,
                            center = center,
                            style = Stroke(width = 2.5f)
                        )
                    }

                    drawCircle(
                        color = mainColor.copy(alpha = 0.15f),
                        radius = baseRadius + (activeVolume * 22f),
                        center = center
                    )
                }

                // Interactive Center Ultra-Large Microphone Button (110dp x 110dp)
                Box(
                    modifier = Modifier
                        .size(112.dp)
                        .scale(pulseScale)
                        .shadow(elevation = 12.dp, shape = CircleShape, ambientColor = mainColor, spotColor = mainColor)
                        .clip(CircleShape)
                        .background(
                            brush = when {
                                isRecording -> Brush.radialGradient(
                                    listOf(Rose500, Rose600)
                                )
                                isAiSpeaking -> Brush.radialGradient(
                                    listOf(Indigo500, Indigo600)
                                )
                                else -> Brush.radialGradient(
                                    listOf(Emerald500, Emerald600)
                                )
                            }
                        )
                        .border(
                            width = 3.5.dp,
                            color = when {
                                isRecording -> Color(0xFFFF8A9B)
                                isAiSpeaking -> Color(0xFFA5B4FC)
                                else -> Color(0xFF6EE7B7)
                            },
                            shape = CircleShape
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = rememberRipple(bounded = true, color = Color.White),
                            onClick = onToggleMic
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(6.dp)
                    ) {
                        if (isAiSpeaking) {
                            Icon(
                                imageVector = Icons.Default.VolumeUp,
                                contentDescription = "AI Speaking",
                                tint = Color.White,
                                modifier = Modifier.size(42.dp)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "NGẮT LỜI",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.8.sp
                            )
                        } else if (isRecording) {
                            Icon(
                                imageVector = Icons.Default.MicOff,
                                contentDescription = "Stop Recording",
                                tint = Color.White,
                                modifier = Modifier.size(42.dp)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "TẮT MIC",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.8.sp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Mic,
                                contentDescription = "Start Recording",
                                tint = Color.White,
                                modifier = Modifier.size(44.dp)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "BẬT MIC",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.8.sp
                            )
                        }
                    }
                }
            }

            // Realtime Equalizer Bars
            Row(
                horizontalArrangement = Arrangement.spacedBy(3.5.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.height(20.dp)
            ) {
                repeat(16) { index ->
                    val factor = sin((index / 16f) * Math.PI).toFloat() * activeVolume
                    val barHeight = (4 + factor * 24).coerceIn(4f, 20f).dp

                    Box(
                        modifier = Modifier
                            .width(3.5.dp)
                            .height(barHeight)
                            .clip(CircleShape)
                            .background(mainColor)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Guidance & Car Mode Instruction
            Text(
                text = if (isRecording) "🎙️ ĐANG LẮNG NGHE • Chạm nút to giữa màn hình để tắt" else "✨ CHẠM VÀO NÚT MICRO TRÒN ĐỂ NÓI 2 CHIỀU VỚI AI",
                color = if (isRecording) Emerald400 else Slate300,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.3.sp
            )
        }
    }
}


