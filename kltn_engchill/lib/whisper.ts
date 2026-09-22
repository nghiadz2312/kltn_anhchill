import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Gọi Groq Whisper API để transcribe audio → trả về fullText + segments[] kèm timestamp + language detected
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
    language: string;     // ngôn ngữ Whisper tự detect (vd: "en", "vi", "ja", "ko")
}

/**
 * transcribeVideo
 * Nhận buffer audio → gửi lên Groq Whisper API → trả về transcript + segments.
 *
 * @param audioBuffer - Buffer của file audio (mp3, wav, m4a...)
 * @param fileName - Tên file để Groq nhận dạng định dạng (vd: "audio.mp3")
 * // Trigger deploy: Reverted back to commit 83f9ff9
 */
export async function transcribeVideo(
    audioBuffer: Buffer,
    fileName: string = "audio.mp3",
    language?: string          // truyền "vi", "en", "ja"... hoặc để undefined để tự detect
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
            // Prompt trung tính, không tiếng Anh → không kéo lệch auto-detect
            prompt: "Bài hát. Lời nhạc. Song lyrics.",
            // Chỉ truyền language nếu caller cung cấp, còn lại để Whisper tự detect
            ...(language ? { language } : {}),
        });

        const detectedLanguage = (transcription as any).language || "en";
        console.log(`🌐 Ngôn ngữ phát hiện: ${detectedLanguage}`);

        console.log("✅ Whisper AI xử lý xong!");

        const rawSegments = (transcription as any).segments || [];

        const segments: Segment[] = rawSegments
            .map((seg: any) => ({
                id: seg.id,
                start: parseFloat(seg.start.toFixed(2)),
                end: parseFloat(seg.end.toFixed(2)),
                text: seg.text.trim(),
            }))
            .filter((seg: Segment, idx: number, arr: Segment[]) => {
                // 1. Bỏ segment rỗng
                if (!seg.text) return false;

                // 2. Lọc các câu hallucination phổ biến của Whisper (spam YouTube)
                const hallucinationPatterns = [
                    /subscribe/i,
                    /like v[àa] chia s[eẻ]/i,
                    /nh[aấ]n chu[ôô]ng/i,
                    /gh[iI][eê]n m[iì] g[oõ]/i,
                    /kh[oô]ng b[oỏ] l[oỡ]/i,
                    /video h[aấ]p d[aẫ]n/i,
                    /k[eê]nh .{0,20} [đd][eể]/i,
                    /thank you for watching/i,
                    /please (like|subscribe|share)/i,
                ];
                if (hallucinationPatterns.some(p => p.test(seg.text))) {
                    console.log(`🚫 Bỏ segment hallucination: "${seg.text}"`);
                    return false;
                }

                // 3. Bỏ segment bị lặp liên tiếp (cùng text với segment trước)
                if (idx > 0 && arr[idx - 1].text === seg.text) {
                    console.log(`🔁 Bỏ segment lặp: "${seg.text}"`);
                    return false;
                }

                return true;
            })
            // Re-index id sau khi filter
            .map((seg: Segment, idx: number) => ({ ...seg, id: idx }));

        return {
            fullText: transcription.text,
            segments,
            language: detectedLanguage,
        };
    } catch (error) {
        console.error("Lỗi Whisper AI:", error);
        return {
            fullText: "Không thể nhận diện âm thanh.",
            segments: [],
            language: "en",
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