import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Gọi Groq Whisper API để transcribe audio → trả về fullText + segments[] kèm timestamp
// verbose_json để lấy timestamp từng câu (dùng cho tính năng highlight transcript khi nghe)

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

        // Buffer → ArrayBuffer mới hoàn toàn vì TypeScript không chấp nhận Buffer<ArrayBufferLike> làm BlobPart
        const freshArrayBuffer = new ArrayBuffer(audioBuffer.byteLength);
        new Uint8Array(freshArrayBuffer).set(audioBuffer);
        const audioFile = new File([freshArrayBuffer], fileName, {
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