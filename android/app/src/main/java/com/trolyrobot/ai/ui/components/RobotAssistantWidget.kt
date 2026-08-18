package com.trolyrobot.ai.ui.components

import androidx.compose.animation.core.InfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trolyrobot.ai.ui.theme.Emerald400
import com.trolyrobot.ai.ui.theme.Indigo400
import com.trolyrobot.ai.ui.theme.Indigo500
import com.trolyrobot.ai.ui.theme.Indigo600
import com.trolyrobot.ai.ui.theme.Purple600
import com.trolyrobot.ai.ui.theme.Slate200
import com.trolyrobot.ai.ui.theme.Slate400
import com.trolyrobot.ai.ui.theme.Slate800
import com.trolyrobot.ai.ui.theme.Slate900

@Composable
fun RobotAssistantWidget(
    isAiSpeaking: Boolean,
    isRecording: Boolean
) {
    var isExpanded by remember { mutableStateOf(false) }

    val transition: InfiniteTransition = rememberInfiniteTransition(label = "robot_anim")
    val offsetY by transition.animateFloat(
        initialValue = -4f,
        targetValue = 4f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200),
            repeatMode = androidx.compose.animation.core.RepeatMode.Reverse
        ),
        label = "offsetY"
    )

    Box(
        modifier = Modifier.offset(y = offsetY.dp)
    ) {
        if (!isExpanded) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(Indigo600, Purple600)
                        )
                    )
                    .border(1.5.dp, Indigo400, CircleShape)
                    .clickable { isExpanded = true },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.SmartToy,
                    contentDescription = "Robot Assistant",
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )

                if (isAiSpeaking || isRecording) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(if (isAiSpeaking) Indigo400 else Emerald400)
                    )
                }
            }
        } else {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Slate900.copy(alpha = 0.95f))
                    .border(1.dp, Indigo500.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
                    .clickable { isExpanded = false }
                    .padding(12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Indigo600),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Android,
                            contentDescription = "Robot",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Column {
                        Text(
                            text = "Trợ lý Robot AI",
                            color = Slate200,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (isAiSpeaking) "Đang phản hồi giọng nói..." else if (isRecording) "Đang lắng nghe microphone..." else "Đang ở chế độ chờ",
                            color = if (isAiSpeaking) Indigo400 else if (isRecording) Emerald400 else Slate400,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }
    }
}
