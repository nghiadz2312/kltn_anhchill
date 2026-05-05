import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill - Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562
 *
 * Trước đây dùng response_format: "json" → chỉ trả về text thuần.
 * Bây giờ đổi sang "verbose_json" → trả về text + mảng segments[].
 *
 * Mỗi segment có dạng:
 * {
 *   id: 0,
 *   start: 0.0,   ← bắt đầu ở giây thứ 0
 *   end: 3.5,     ← kết thúc ở giây thứ 3.5
 *   text: " Hello, welcome to this lesson."
 * }
 *
 * Tại sao cần timestamp?
 * → Để trang Watch biết "audio đang ở giây thứ 2.3" → tìm segment nào
 *   có start <= 2.3 <= end → highlight đúng câu đó.
 *   Đây là kỹ thuật gọi là "audio-text synchronization".
 *
 * THAY ĐỔI QUAN TRỌNG (Cloudinary Integration):
 * → Hàm transcribeVideo giờ nhận BUFFER thay vì file path.
 * → Điều này cho phép chạy trên Vercel (serverless, không có filesystem).
 * → Buffer được convert thành File object trước khi gửi lên Groq API.
 */

export interface Segment {
    id: number;
    start: number; // giây bắt đầu
    end: number;   // giây kết thúc
    text: string;  // nội dung câu
}

export interface TranscribeResult {
    fullText: string;     // toàn bộ transcript (để lưu tìm kiếm)
    segments: Segment[];  // từng câu kèm timestamp
}

/**
 * transcribeVideo
 * Nhận buffer audio → gửi lên Groq Whisper API → trả về transcript + segments.
 *
 * @param audioBuffer - Buffer của file audio (mp3, wav, m4a...)
 * @param fileName - Tên file để Groq nhận dạng định dạng (vd: "audio.mp3")
 */
export async function transcribeVideo(
    audioBuffer: Buffer,
    fileName: string = "audio.mp3"
): Promise<TranscribeResult> {
    try {
        console.log("🤖 Đang gửi audio lên Groq Whisper AI...");

        // Tạo File object từ buffer (Groq SDK chấp nhận File/Blob)
        const audioFile = new File([audioBuffer], fileName, {
            type: getAudioMimeType(fileName),
        });

        const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-large-v3",
            response_format: "verbose_json", // lấy timestamps
            language: "en",
        });

        console.log("✅ Whisper AI xử lý xong!");

        const rawSegments = (transcription as any).segments || [];

        const segments: Segment[] = rawSegments.map((seg: any) => ({
            id: seg.id,
            start: parseFloat(seg.start.toFixed(2)),
            end: parseFloat(seg.end.toFixed(2)),
            text: seg.text.trim(),
        }));

        return {
            fullText: transcription.text,
            segments,
        };
    } catch (error) {
        console.error("Lỗi Whisper AI:", error);
        return {
            fullText: "Không thể nhận diện âm thanh.",
            segments: [],
        };
    }
}

/** Xác định MIME type từ tên file */
function getAudioMimeType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/mp4",
        webm: "audio/webm",
        ogg: "audio/ogg",
        flac: "audio/flac",
    };
    return mimeTypes[ext || ""] || "audio/mpeg";
}