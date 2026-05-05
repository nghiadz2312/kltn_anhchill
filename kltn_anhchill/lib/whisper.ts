import Groq from "groq-sdk";
import fs from "fs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
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

export async function transcribeVideo(filePath: string): Promise<TranscribeResult> {
    try {
        console.log("🤖 Đang gửi audio lên Groq Whisper AI...");

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
            response_format: "verbose_json", // ← THAY ĐỔI QUAN TRỌNG: lấy timestamps
            language: "en",
            // timestamp_granularities: ["segment"], // segment-level là đủ
        });

        console.log("✅ Whisper AI xử lý xong!");

        // Lấy segments từ response
        const rawSegments = (transcription as any).segments || [];

        const segments: Segment[] = rawSegments.map((seg: any) => ({
            id: seg.id,
            start: parseFloat(seg.start.toFixed(2)),
            end: parseFloat(seg.end.toFixed(2)),
            text: seg.text.trim(),
        }));

        return {
            fullText: transcription.text, // text tổng hợp
            segments,
        };
    } catch (error) {
        console.error("Lỗi Whisper AI:", error);
        // Fallback: không có timestamp
        return {
            fullText: "Không thể nhận diện âm thanh.",
            segments: [],
        };
    }
}