package com.trolyrobot.ai.ui.components

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
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.trolyrobot.ai.ui.theme.Emerald400
import com.trolyrobot.ai.ui.theme.Indigo400
import com.trolyrobot.ai.ui.theme.Indigo600
import com.trolyrobot.ai.ui.theme.Slate100
import com.trolyrobot.ai.ui.theme.Slate200
import com.trolyrobot.ai.ui.theme.Slate400
import com.trolyrobot.ai.ui.theme.Slate800
import com.trolyrobot.ai.ui.theme.Slate900

@Composable
fun VersionInfoDialog(
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .border(1.dp, Slate800, RoundedCornerShape(24.dp)),
            color = Slate900
        ) {
            Column(
                modifier = Modifier.padding(18.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF064E3B)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Bookmark,
                                contentDescription = "Version",
                                tint = Emerald400,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "Phiên Bản V1.1 - Android Native",
                                color = Slate100,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Anchor Point Native Release",
                                color = Emerald400,
                                fontSize = 10.sp
                            )
                        }
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Slate400,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF022C22))
                        .border(1.dp, Color(0xFF047857), RoundedCornerShape(14.dp))
                        .padding(10.dp)
                ) {
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Check",
                            tint = Emerald400,
                            modifier = Modifier
                                .size(18.dp)
                                .padding(top = 2.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Điểm neo hệ thống Android Native V1.1 hoàn chỉnh! Hỗ trợ Jetpack Compose, OkHttp WSS, AudioRecord 16kHz PCM, AudioTrack 24kHz PCM streaming.",
                            color = Emerald400,
                            fontSize = 11.sp,
                            lineHeight = 16.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "📱 TÍNH NĂNG NỔI BẬT V1.1 NATIVE:",
                    color = Indigo400,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(6.dp))

                val features = listOf(
                    "⚡ Jetpack Compose UI tối ưu chuẩn Material 3 & Slate theme",
                    "🎙️ Realtime Microphone AudioRecord streaming 16kHz PCM Base64",
                    "🔊 Realtime AudioTrack streaming playback 24kHz PCM low latency",
                    "💬 Multimodal File AI hỗ trợ gửi hình ảnh & tài liệu phân tích",
                    "🤖 Floating Assistant Robot Widget hoạt họa sống động"
                )

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    features.forEach { feat ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Slate800)
                                .padding(8.dp)
                        ) {
                            Text(
                                text = feat,
                                color = Slate200,
                                fontSize = 11.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(text = "Đóng", color = Color.White, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
