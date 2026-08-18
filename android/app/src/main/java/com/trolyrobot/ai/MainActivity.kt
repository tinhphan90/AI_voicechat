package com.trolyrobot.ai

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Base64
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.trolyrobot.ai.data.FileAttachment
import com.trolyrobot.ai.ui.components.ChatHistoryView
import com.trolyrobot.ai.ui.components.FloatingChatInput
import com.trolyrobot.ai.ui.components.ModelSelectorBar
import com.trolyrobot.ai.ui.components.RobotAssistantWidget
import com.trolyrobot.ai.ui.components.SettingsDialog
import com.trolyrobot.ai.ui.components.TopBar
import com.trolyrobot.ai.ui.components.VersionInfoDialog
import com.trolyrobot.ai.ui.components.VoiceVisualizerView
import com.trolyrobot.ai.ui.theme.AiRealtimeVoiceChatTheme
import com.trolyrobot.ai.ui.theme.Slate950
import com.trolyrobot.ai.viewmodel.MainViewModel
import java.io.InputStream

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            AiRealtimeVoiceChatTheme {
                MainScreen(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun MainScreen(viewModel: MainViewModel) {
    val context = LocalContext.current

    val connectionState by viewModel.connectionState.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val selectedModel by viewModel.selectedModel.collectAsState()
    val selectedVoice by viewModel.selectedVoice.collectAsState()
    val systemInstruction by viewModel.systemInstruction.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val pendingAttachments by viewModel.pendingAttachments.collectAsState()
    val userVolume by viewModel.userVolume.collectAsState()
    val aiVolume by viewModel.aiVolume.collectAsState()
    val isRecording by viewModel.isRecording.collectAsState()
    val isAiSpeaking by viewModel.isAiSpeaking.collectAsState()
    val isSettingsOpen by viewModel.isSettingsOpen.collectAsState()
    val isVersionModalOpen by viewModel.isVersionModalOpen.collectAsState()

    var showMicPermissionDeniedDialog by remember { mutableStateOf(false) }

    // Handle Car Action Events (Navigation, YouTube, Music)
    LaunchedEffect(Unit) {
        viewModel.carActionEvent.collect { event ->
            when (event.type) {
                "navigate_to" -> {
                    if (event.destination.isNotEmpty()) {
                        val navUri = Uri.parse("google.navigation:q=${Uri.encode(event.destination)}")
                        val mapIntent = Intent(Intent.ACTION_VIEW, navUri).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        try {
                            context.startActivity(mapIntent)
                        } catch (e: Exception) {
                            val webUri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(event.destination)}")
                            context.startActivity(Intent(Intent.ACTION_VIEW, webUri).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                        }
                    }
                }
                "open_youtube" -> {
                    val query = event.query.ifEmpty { "nhạc hay" }
                    val ytUri = Uri.parse("https://www.youtube.com/results?search_query=${Uri.encode(query)}")
                    val ytIntent = Intent(Intent.ACTION_VIEW, ytUri).apply {
                        setPackage("com.google.android.youtube")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    try {
                        context.startActivity(ytIntent)
                    } catch (e: Exception) {
                        context.startActivity(Intent(Intent.ACTION_VIEW, ytUri).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                    }
                }
                "play_music" -> {
                    val song = event.songName.ifEmpty { "nhạc trẻ" }
                    val mediaIntent = Intent(android.provider.MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH).apply {
                        putExtra(android.app.SearchManager.QUERY, song)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    try {
                        context.startActivity(mediaIntent)
                    } catch (e: Exception) {
                        val webUri = Uri.parse("https://zingmp3.vn/tim-kiem/tat-ca?q=${Uri.encode(song)}")
                        context.startActivity(Intent(Intent.ACTION_VIEW, webUri).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                    }
                }
            }
        }
    }

    // Permission Launcher for Microphone
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            Toast.makeText(context, "Đã cấp quyền Microphone thành công!", Toast.LENGTH_SHORT).show()
            viewModel.startMicrophone()
        } else {
            showMicPermissionDeniedDialog = true
        }
    }

    // Auto-request Microphone permission on App Startup if not granted yet
    LaunchedEffect(Unit) {
        val hasMicPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasMicPermission) {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    // File Picker Launcher for Multimodal AI Attachments
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { fileUri ->
            try {
                val contentResolver = context.contentResolver
                val mimeType = contentResolver.getType(fileUri) ?: "application/octet-stream"
                val inputStream: InputStream? = contentResolver.openInputStream(fileUri)
                val bytes = inputStream?.readBytes()
                inputStream?.close()

                if (bytes != null) {
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    val fileName = fileUri.lastPathSegment ?: "tep_dinh_kem"

                    val isText = mimeType.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".json")
                    val textContent = if (isText) String(bytes) else null

                    viewModel.addAttachment(
                        FileAttachment(
                            name = fileName,
                            type = mimeType,
                            size = bytes.size.toLong(),
                            dataBase64 = base64,
                            isText = isText,
                            textContent = textContent
                        )
                    )
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Không thể đọc tệp: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
        }
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950),
        topBar = {
            TopBar(
                connectionState = connectionState,
                onOpenVersionModal = { viewModel.setVersionModalOpen(true) },
                onOpenSettings = { viewModel.setSettingsOpen(true) },
                onReconnect = { viewModel.reconnect() }
            )
        }
    ) { innerPadding ->
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Slate950)
        ) {
            val isLandscape = maxWidth > maxHeight && maxWidth > 600.dp

            val handleToggleMic = {
                val hasMicPermission = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED

                if (hasMicPermission) {
                    viewModel.toggleMicrophone()
                } else {
                    permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            }

            if (isLandscape) {
                // Car Head Unit & Tablet Landscape Dual-Pane Layout
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                ) {
                    // Left Pane (Car Voice Hub + Model Bar)
                    Column(
                        modifier = Modifier
                            .weight(0.44f)
                            .fillMaxHeight()
                    ) {
                        ModelSelectorBar(
                            selectedModel = selectedModel,
                            onSelectModel = { viewModel.selectModel(it) }
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        VoiceVisualizerView(
                            connectionState = connectionState,
                            selectedVoice = selectedVoice,
                            userVolume = userVolume,
                            aiVolume = aiVolume,
                            isRecording = isRecording,
                            isAiSpeaking = isAiSpeaking,
                            onToggleMic = handleToggleMic,
                            onReconnect = { viewModel.reconnect() }
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Right Pane (Chat History + Floating Input)
                    Column(
                        modifier = Modifier
                            .weight(0.56f)
                            .fillMaxHeight()
                    ) {
                        ChatHistoryView(
                            messages = messages,
                            onClearHistory = { viewModel.clearHistory() },
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 4.dp)
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        FloatingChatInput(
                            pendingAttachments = pendingAttachments,
                            isRecording = isRecording,
                            onSendText = { text -> viewModel.sendTextMessage(text) },
                            onToggleMic = handleToggleMic,
                            onPickFile = { filePickerLauncher.launch("*/*") },
                            onRemoveAttachment = { id -> viewModel.removeAttachment(id) }
                        )
                    }
                }
            } else {
                // Mobile Portrait Single Column Layout
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // 1. Model Selector Chips
                    ModelSelectorBar(
                        selectedModel = selectedModel,
                        onSelectModel = { viewModel.selectModel(it) }
                    )

                    // 2. Realtime Voice Visualizer Canvas Card with Central Mic Button
                    VoiceVisualizerView(
                        connectionState = connectionState,
                        selectedVoice = selectedVoice,
                        userVolume = userVolume,
                        aiVolume = aiVolume,
                        isRecording = isRecording,
                        isAiSpeaking = isAiSpeaking,
                        onToggleMic = handleToggleMic,
                        onReconnect = { viewModel.reconnect() }
                    )

                    // 3. Chat History
                    ChatHistoryView(
                        messages = messages,
                        onClearHistory = { viewModel.clearHistory() },
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 8.dp)
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // 4. Pinned Floating Chat Input
                    FloatingChatInput(
                        pendingAttachments = pendingAttachments,
                        isRecording = isRecording,
                        onSendText = { text -> viewModel.sendTextMessage(text) },
                        onToggleMic = handleToggleMic,
                        onPickFile = { filePickerLauncher.launch("*/*") },
                        onRemoveAttachment = { id -> viewModel.removeAttachment(id) }
                    )
                }
            }

            // Floating Robot Assistant Widget in top-right overlay
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 10.dp, end = 16.dp)
            ) {
                RobotAssistantWidget(
                    isAiSpeaking = isAiSpeaking,
                    isRecording = isRecording
                )
            }

            // Dialog Modals
            if (isSettingsOpen) {
                SettingsDialog(
                    currentVoice = selectedVoice,
                    currentInstruction = systemInstruction,
                    currentServerUrl = serverUrl,
                    onSaveVoice = { viewModel.setVoice(it) },
                    onSaveInstruction = { viewModel.setSystemInstruction(it) },
                    onSaveServerUrl = { viewModel.setServerUrl(it) },
                    onDismiss = { viewModel.setSettingsOpen(false) }
                )
            }

            if (isVersionModalOpen) {
                VersionInfoDialog(
                    onDismiss = { viewModel.setVersionModalOpen(false) }
                )
            }

            if (showMicPermissionDeniedDialog) {
                AlertDialog(
                    onDismissRequest = { showMicPermissionDeniedDialog = false },
                    title = { Text("Quyền truy cập Microphone") },
                    text = {
                        Text("Ứng dụng cần quyền Microphone để thu âm giọng nói và trò chuyện 2 chiều với Trợ lý AI. Vui lòng nhấn 'Cấp quyền' hoặc 'Mở Cài đặt' để cho phép ứng dụng sử dụng Micro.")
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showMicPermissionDeniedDialog = false
                                try {
                                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                        data = Uri.fromParts("package", context.packageName, null)
                                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    }
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Không thể mở Cài đặt", Toast.LENGTH_SHORT).show()
                                }
                            }
                        ) {
                            Text("Mở Cài đặt")
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = {
                                showMicPermissionDeniedDialog = false
                                permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            }
                        ) {
                            Text("Cấp quyền lại")
                        }
                    }
                )
            }
        }
    }
}
