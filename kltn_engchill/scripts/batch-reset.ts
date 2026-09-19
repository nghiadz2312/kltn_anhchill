/**
 * 🔄 BATCH RESET — Re-transcribe tất cả video + sinh lại bài tập
 * 
 * Script này sẽ:
 * 1. Lấy tất cả video trong DB
 * 2. Từng video: fetch audio → Whisper AI re-transcribe → detect ngôn ngữ → lưu DB
 * 3. Sinh lại bài tập (exercises) theo ngôn ngữ mới detected
 * 
 * Chạy:   npx tsx scripts/batch-reset.ts
 * 
 * Tác giả: KLTN_engchill — Nguyễn Giang Tuấn Nghĩa A46562
 */

import mongoose from "mongoose";
import Groq from "groq-sdk";
import path from "path";
import fs from "fs";

// ── Load .env.local thủ công (không cần dotenv) ──
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!process.env[key]) process.env[key] = value;
    }
}

const MONGODB_URI = process.env.MONGODB_URI!;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

if (!MONGODB_URI) throw new Error("Thiếu MONGODB_URI trong .env.local");
if (!process.env.GROQ_API_KEY) throw new Error("Thiếu GROQ_API_KEY trong .env.local");

// ── Schema (copy từ models/ để script chạy độc lập) ──
const segmentSchema = new mongoose.Schema({
    id: { type: Number },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true },
}, { _id: false });

const videoSchema = new mongoose.Schema({
    title: String,
    description: String,
    videoUrl: String,
    thumbnail: String,
    level: String,
    duration: Number,
    script: String,
    language: { type: String, default: "en" },
    segments: [segmentSchema],
    collections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Collection" }],
    viewCount: Number,
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    type: { type: String, enum: ["multiple_choice", "fill_blank"], required: true },
    question: { type: String, default: "" },
    options: { type: [String], default: [] },
    correctIndex: { type: Number, default: 0 },
    explanation: { type: String, default: "" },
    sentence: { type: String, default: "" },
    blankedSentence: { type: String, default: "" },
    answer: { type: String, default: "" },
    hint: { type: String, default: "" },
}, { timestamps: true });

const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);
const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);

// ── Helper: Fetch file từ URL ──
async function fetchFileFromUrl(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Không thể tải file từ URL: ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// ── Helper: MIME type ──
function getAudioMimeType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
        webm: "audio/webm", ogg: "audio/ogg", flac: "audio/flac",
    };
    return mimeTypes[ext || ""] || "audio/mpeg";
}

// ── Whisper Transcribe ──
async function transcribeAudio(buffer: Buffer, fileName: string) {
    const freshArrayBuffer = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(freshArrayBuffer).set(buffer);
    const audioFile = new File([freshArrayBuffer], fileName, {
        type: getAudioMimeType(fileName),
    });

    const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "verbose_json",
        // Không hardcode language → tự detect
    });

    const detectedLanguage = (transcription as any).language || "en";
    const rawSegments = (transcription as any).segments || [];
    const segments = rawSegments.map((seg: any) => ({
        id: seg.id,
        start: parseFloat(seg.start.toFixed(2)),
        end: parseFloat(seg.end.toFixed(2)),
        text: seg.text.trim(),
    }));

    return { fullText: transcription.text, segments, language: detectedLanguage };
}

// ── Generate Exercises ──
async function generateExercises(transcript: string, videoTitle: string, language: string, count: number = 6) {
    const languageNames: Record<string, string> = {
        en: "English", vi: "Vietnamese", ja: "Japanese", ko: "Korean",
        zh: "Chinese", fr: "French", es: "Spanish", de: "German",
        th: "Thai", pt: "Portuguese", ru: "Russian", ar: "Arabic",
    };
    const langName = languageNames[language] || language;

    const systemPrompt = `You are an expert language teacher creating exercises for students learning ${langName}.
Your task: Generate exercises from the given audio transcript which is in ${langName}.
Rules:
- Create a mix of multiple_choice and fill_blank questions
- Questions must be DIRECTLY based on the transcript content
- ALL questions, options, explanations, sentences, and hints MUST be in ${langName}
- For fill_blank: blank out important vocabulary words
- For multiple_choice: test comprehension, vocabulary, or grammar
- ALWAYS respond with valid JSON only, no extra text`;

    const userPrompt = `
Transcript from lesson "${videoTitle}" (Language: ${langName}):
"""
${transcript.slice(0, 3000)}
"""

Generate exactly ${count} questions in ${langName}. Return JSON:
{
  "questions": [
    { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." },
    { "type": "fill_blank", "sentence": "Full sentence.", "blankedSentence": "Full ___.", "answer": "sentence", "hint": "noun" }
  ]
}`;

    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    return parsed.questions || [];
}

// ── Delay helper (tránh rate limit Groq) ──
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ══════════════════════════════════════════
// ██  MAIN
// ══════════════════════════════════════════
async function main() {
    console.log("═══════════════════════════════════════════════");
    console.log("  🔄 BATCH RESET — Re-transcribe + Re-generate");
    console.log("═══════════════════════════════════════════════\n");

    // 1. Kết nối DB
    console.log("📡 Đang kết nối MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Kết nối MongoDB thành công!\n");

    // 2. Lấy tất cả video
    const videos = await Video.find({}).sort({ createdAt: 1 });
    console.log(`📋 Tìm thấy ${videos.length} video trong DB\n`);

    if (videos.length === 0) {
        console.log("⚠️ Không có video nào. Thoát.");
        process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const progress = `[${i + 1}/${videos.length}]`;

        console.log(`\n${"─".repeat(50)}`);
        console.log(`${progress} 🎵 "${video.title}"`);
        console.log(`   URL: ${video.videoUrl}`);

        try {
            // ── BƯỚC 1: Fetch audio ──
            if (!video.videoUrl || !video.videoUrl.startsWith("http")) {
                console.log(`   ⚠️ SKIP — URL không hợp lệ hoặc file local`);
                failCount++;
                continue;
            }

            console.log(`   📥 Đang tải audio...`);
            const buffer = await fetchFileFromUrl(video.videoUrl);
            const fileName = path.basename(video.videoUrl);

            // ── BƯỚC 2: Whisper Re-transcribe ──
            console.log(`   🤖 Whisper AI đang transcribe...`);
            const { fullText, segments, language } = await transcribeAudio(buffer, fileName);

            if (!fullText || fullText.length < 10) {
                console.log(`   ❌ Whisper không nhận diện được nội dung`);
                failCount++;
                continue;
            }

            console.log(`   🌐 Ngôn ngữ: ${language} | ${segments.length} segments`);

            // ── BƯỚC 3: Cập nhật transcript + language vào DB ──
            await Video.findByIdAndUpdate(video._id, {
                script: fullText,
                segments: segments,
                language: language,
            });
            console.log(`   💾 Đã lưu transcript + language`);

            // Nghỉ 2s tránh rate limit
            await sleep(2000);

            // ── BƯỚC 4: Sinh lại bài tập ──
            console.log(`   📝 Đang sinh bài tập (${language})...`);
            const questions = await generateExercises(fullText, video.title, language, 6);

            if (questions.length > 0) {
                // Lưu câu hỏi mới (KHÔNG xóa cũ — giữ lịch sử)
                await Question.insertMany(
                    questions.map((q: any) => ({ ...q, videoId: video._id }))
                );
                console.log(`   ✅ Đã sinh ${questions.length} câu hỏi mới!`);
            } else {
                console.log(`   ⚠️ AI không sinh được câu hỏi`);
            }

            successCount++;

            // Nghỉ 3s giữa các video tránh rate limit
            if (i < videos.length - 1) {
                console.log(`   ⏳ Chờ 3s trước video tiếp theo...`);
                await sleep(3000);
            }

        } catch (error: any) {
            console.error(`   ❌ LỖI: ${error.message}`);
            failCount++;

            // Nếu rate limit, chờ lâu hơn
            if (error.message?.includes("rate") || error.status === 429) {
                console.log(`   ⏳ Rate limit! Chờ 30s...`);
                await sleep(30000);
            } else {
                await sleep(2000);
            }
        }
    }

    // ── KẾT QUẢ ──
    console.log(`\n${"═".repeat(50)}`);
    console.log(`  ✅ HOÀN TẤT!`);
    console.log(`  ✅ Thành công: ${successCount}/${videos.length}`);
    console.log(`  ❌ Thất bại:  ${failCount}/${videos.length}`);
    console.log(`${"═".repeat(50)}\n`);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error("💥 Lỗi nghiêm trọng:", err);
    process.exit(1);
});
