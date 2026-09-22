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

        // Không truyền language → để Whisper tự detect (tránh "language override unsupported")
        // Không truyền prompt tiếng Anh → tránh kéo lệch khi nhạc Việt/Nhật/Hàn
        const baseParams = {
            file: audioFile,
            model: "whisper-large-v3-turbo" as const,  // turbo hỗ trợ đa ngôn ngữ tốt hơn
            prompt: "Lời bài hát.",                     // prompt trung tính
        };

        let transcription: any;
        let usedFallback = false;

        try {
            // Thử verbose_json trước để lấy timestamps
            transcription = await groq.audio.transcriptions.create({
                ...baseParams,
                response_format: "verbose_json",
            });
        } catch (verboseErr: any) {
            // Groq ném "language override unsupported" với một số ngôn ngữ khi dùng verbose_json
            // → Fallback sang json thường (không có segments timestamps)
            console.warn(`⚠️ verbose_json thất bại (${verboseErr?.message}), fallback sang json...`);
            usedFallback = true;
            transcription = await groq.audio.transcriptions.create({
                ...baseParams,
                response_format: "json",
            });
        }

        const detectedLanguage = (transcription as any).language || "vi";
        console.log(`🌐 Ngôn ngữ phát hiện: ${detectedLanguage} | fallback mode: ${usedFallback}`);

        console.log("✅ Whisper AI xử lý xong!");

        const fullText: string = transcription.text || "";
        let rawSegments = (transcription as any).segments || [];

        // Nếu fallback sang json → không có segments, tự split từ fullText
        if (usedFallback || rawSegments.length === 0) {
            console.log("📝 Fallback: tự tạo segments từ fullText (không có timestamps)");
            rawSegments = fullText
                .split(/(?<=[.!?…])\s+|\n/)  // split theo dấu câu hoặc xuống dòng
                .filter((s: string) => s.trim().length > 0)
                .map((text: string, idx: number) => ({
                    id: idx,
                    start: 0,   // không có timestamp thực
                    end: 0,
                    text: text.trim(),
                }));
        }

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
            fullText,
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