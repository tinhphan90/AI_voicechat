package com.trolyrobot.ai.data

import java.util.UUID

enum class Role {
    USER, MODEL, SYSTEM
}

data class FileAttachment(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val type: String, // mimeType, e.g. "image/png", "text/plain"
    val size: Long,
    val dataBase64: String? = null,
    val isText: Boolean = false,
    val textContent: String? = null
)

data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: Role,
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isStreaming: Boolean = false,
    val attachments: List<FileAttachment> = emptyList()
)

enum class ConnectionState {
    DISCONNECTED, CONNECTING, CONNECTED, ERROR
}

enum class VoiceOption(val id: String, val voiceName: String, val gender: String, val description: String) {
    ZEPHYR("Zephyr", "Zephyr", "Nữ", "Ấm áp, tự nhiên, truyền cảm"),
    PUCK("Puck", "Puck", "Nam", "Sống động, năng động, hóm hỉnh"),
    CHARON("Charon", "Charon", "Nam", "Trầm tĩnh, tri thức, tự tin"),
    KORE("Kore", "Kore", "Nữ", "Nhẹ nhàng, trong trẻo, điềm tĩnh"),
    FENRIR("Fenrir", "Fenrir", "Nam", "Duy lý, rõ ràng, kỹ thuật")
}

data class AiModelProfile(
    val id: String,
    val geminiModel: String,
    val name: String,
    val category: String,
    val badge: String,
    val description: String,
    val defaultPrompt: String,
    val recommendedVoice: VoiceOption,
    val accentColorHex: Long
)

val DEFAULT_AI_MODELS = listOf(
    AiModelProfile(
        id = "creative",
        geminiModel = "gemini-3.1-flash-live-preview",
        name = "Creative Storyteller",
        category = "Creative",
        badge = "Sáng tạo & Văn thơ",
        description = "Mô hình giàu trí tưởng tượng, hỗ trợ viết kịch bản, lên ý tưởng nội dung, sáng tác truyện văn thơ.",
        defaultPrompt = "Bạn là một nhà sáng tác kịch bản và sáng tạo nội dung giàu trí tưởng tượng. Hãy sử dụng văn phong truyền cảm, cuốn hút và sáng tạo trong từng câu nói.",
        recommendedVoice = VoiceOption.PUCK,
        accentColorHex = 0xFFF43F5E
    ),
    AiModelProfile(
        id = "companion",
        geminiModel = "gemini-3.1-flash-live-preview",
        name = "Conversational Companion",
        category = "Conversational",
        badge = "Thân thiện & Tự nhiên",
        description = "Trợ lý trò chuyện giọng nói ấm áp, lắng nghe, phản hồi tự nhiên như người bạn đời thường.",
        defaultPrompt = "Bạn là một người bạn đồng hành trò chuyện ấm áp, lắng nghe chân thành, giao tiếp bằng tiếng Việt tự nhiên, thân thiện và mạch lạc.",
        recommendedVoice = VoiceOption.ZEPHYR,
        accentColorHex = 0xFF6366F1
    ),
    AiModelProfile(
        id = "factual",
        geminiModel = "gemini-3.1-flash-live-preview",
        name = "Factual Q&A Expert",
        category = "Factual",
        badge = "Tri thức & Khoa học",
        description = "Tập trung giải đáp thắc mắc khoa học, sự thật khách quan, phân tích dữ liệu ngắn gọn và chính xác.",
        defaultPrompt = "Bạn là một chuyên gia tri thức bách khoa. Hãy trả lời các câu hỏi dựa trên kiến thức khoa học, sự thật chính xác, khách quan và súc tích.",
        recommendedVoice = VoiceOption.CHARON,
        accentColorHex = 0xFFF59E0B
    ),
    AiModelProfile(
        id = "technical",
        geminiModel = "gemini-3.1-flash-live-preview",
        name = "Technical & Code Architect",
        category = "Technical",
        badge = "Lập trình & Kỹ thuật",
        description = "Chuyên gia phần mềm hỗ trợ phân tích thuật toán, sửa lỗi code, thiết kế hệ thống và công nghệ.",
        defaultPrompt = "Bạn là một kỹ sư phần mềm cao cấp. Hãy trả lời các vấn đề lập trình, kiến trúc hệ thống và thuật toán một cách trực diện, chuyên nghiệp.",
        recommendedVoice = VoiceOption.FENRIR,
        accentColorHex = 0xFF10B981
    ),
    AiModelProfile(
        id = "education",
        geminiModel = "gemini-3.1-flash-live-preview",
        name = "Bilingual Language Tutor",
        category = "Education",
        badge = "Gia sư Song ngữ Anh - Việt",
        description = "Luyện phản xạ nói tiếng Anh - tiếng Việt, nhắc nhở từ vựng và tự nhiên sửa ngữ pháp khi hội thoại.",
        defaultPrompt = "You are an encouraging English-Vietnamese language tutor. Help the user practice real-time speaking, gently correct grammar, and encourage active conversation.",
        recommendedVoice = VoiceOption.KORE,
        accentColorHex = 0xFF06B6D4
    )
)

data class LatencyStats(
    val wsPingMs: Long = 0,
    val lastChunkTimeMs: Long = 0,
    val audioChunksReceived: Int = 0,
    val audioChunksSent: Int = 0
)
