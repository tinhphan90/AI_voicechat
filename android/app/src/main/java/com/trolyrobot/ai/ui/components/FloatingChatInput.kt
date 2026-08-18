package com.trolyrobot.ai.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trolyrobot.ai.data.FileAttachment
import com.trolyrobot.ai.ui.theme.Emerald400
import com.trolyrobot.ai.ui.theme.Emerald500
import com.trolyrobot.ai.ui.theme.Emerald600
import com.trolyrobot.ai.ui.theme.Indigo400
import com.trolyrobot.ai.ui.theme.Indigo500
import com.trolyrobot.ai.ui.theme.Indigo600
import com.trolyrobot.ai.ui.theme.Rose500
import com.trolyrobot.ai.ui.theme.Rose600
import com.trolyrobot.ai.ui.theme.Slate100
import com.trolyrobot.ai.ui.theme.Slate300
import com.trolyrobot.ai.ui.theme.Slate400
import com.trolyrobot.ai.ui.theme.Slate800
import com.trolyrobot.ai.ui.theme.Slate900

@Composable
fun FloatingChatInput(
    pendingAttachments: List<FileAttachment>,
    isRecording: Boolean,
    onSendText: (String) -> Unit,
    onToggleMic: () -> Unit,
    onPickFile: () -> Unit,
    onRemoveAttachment: (String) -> Unit
) {
    var textInput by remember { mutableStateOf("") }

    val quickCarPrompts = listOf(
        "🚗 Dẫn đường về nhà",
        "⛽ Tìm cây xăng gần nhất",
        "🎵 Mở nhạc acoustic thư giãn",
        "⛅ Thời tiết hôm nay thế nào?",
        "☕ Quán cà phê gần đây"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 6.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(Slate900.copy(alpha = 0.96f))
            .border(1.5.dp, Indigo500.copy(alpha = 0.4f), RoundedCornerShape(24.dp))
            .padding(8.dp)
    ) {
        // Quick Car & AI Suggestions Horizontal Scroll
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.padding(bottom = 6.dp)
        ) {
            items(quickCarPrompts) { prompt ->
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Slate800)
                        .border(1.dp, Indigo500.copy(alpha = 0.35f), CircleShape)
                        .clickable { onSendText(prompt) }
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = prompt,
                        color = Slate300,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        // Attachment Previews Tray
        if (pendingAttachments.isNotEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(bottom = 6.dp)
            ) {
                items(pendingAttachments, key = { it.id }) { att ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Slate800)
                            .border(1.dp, Emerald500.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "📄 ${att.name}",
                                color = Emerald400,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Remove",
                                tint = Slate400,
                                modifier = Modifier
                                    .size(14.dp)
                                    .clickable { onRemoveAttachment(att.id) }
                            )
                        }
                    }
                }
            }
        }

        // Input Controls Row with Prominent Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // File Attachment Button
            IconButton(
                onClick = onPickFile,
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Slate800)
            ) {
                Icon(
                    imageVector = Icons.Default.AttachFile,
                    contentDescription = "Attach File",
                    tint = Slate300,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.width(6.dp))

            // Text Input Field
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Slate800)
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                if (textInput.isEmpty()) {
                    Text(
                        text = "Nhập tin nhắn hoặc lệnh xe...",
                        color = Slate400,
                        fontSize = 12.sp
                    )
                }

                BasicTextField(
                    value = textInput,
                    onValueChange = { textInput = it },
                    textStyle = TextStyle(
                        color = Slate100,
                        fontSize = 13.sp
                    ),
                    cursorBrush = SolidColor(Indigo400),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.width(6.dp))

            // Large Prominent Microphone Toggle Button (46dp)
            IconButton(
                onClick = onToggleMic,
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(if (isRecording) Rose600 else Emerald600)
                    .border(
                        2.dp,
                        if (isRecording) Color(0xFFFF8A9B) else Color(0xFF6EE7B7),
                        CircleShape
                    )
            ) {
                Icon(
                    imageVector = if (isRecording) Icons.Default.MicOff else Icons.Default.Mic,
                    contentDescription = "Microphone",
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(6.dp))

            // Send Button
            IconButton(
                onClick = {
                    if (textInput.isNotBlank() || pendingAttachments.isNotEmpty()) {
                        onSendText(textInput)
                        textInput = ""
                    }
                },
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Indigo600)
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Send",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
