import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";
import Question from "@/models/Question";
import { generateExercises } from "@/lib/gpt";

/**
 * 📘 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill
 * Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562 - Đại học Thăng Long
 * 
 * LOGIC LƯU TRỮ CÂU HỎI (Persistent Questions):
 * 1. Không sử dụng deleteMany: Để hỗ trợ tính năng "Xem lại lịch sử", chúng ta không được xóa 
 *    câu hỏi cũ. Nếu xóa, các bản ghi UserProgress sẽ bị mất tham chiếu (QuestionId bị null).
 * 2. Versioning: Mỗi lần sinh câu hỏi mới, chúng ta đơn giản là thêm vào DB. 
 * 3. Retrieval: Khi người dùng làm bài, chúng ta sẽ lấy N câu hỏi MỚI NHẤT (sort by createdAt -1).
 */

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { videoId, count = 6, forceRegenerate = false } = await req.json();

        if (!videoId) return NextResponse.json({ error: "Thiếu videoId" }, { status: 400 });

        // 📘 BƯỚC 1: Kiểm tra cache (Chỉ lấy N câu hỏi mới nhất để đảm bảo tính cập nhật)
        if (!forceRegenerate) {
            const existing = await Question.find({ videoId }).sort({ createdAt: -1 }).limit(count);
            if (existing.length > 0) {
                return NextResponse.json({ source: "cache", questions: existing });
            }
        }

        // 📘 BƯỚC 2: Lấy transcript
        const video = await Video.findById(videoId).select("title script");
        if (!video || !video.script) return NextResponse.json({ error: "Thiếu transcript" }, { status: 400 });

        // 📘 BƯỚC 3: Gọi AI sinh câu hỏi
        const { questions } = await generateExercises(video.script, video.title, count);
        if (!questions.length) return NextResponse.json({ error: "AI lỗi" }, { status: 500 });

        // 📘 BƯỚC 4: LƯU MỚI (KHÔNG XÓA CŨ)
        // Việc xóa cũ (deleteMany) đã bị loại bỏ để bảo toàn dữ liệu lịch sử bài làm.
        const savedQuestions = await Question.insertMany(
            questions.map((q) => ({ ...q, videoId }))
        );

        return NextResponse.json({ source: "ai_generated", questions: savedQuestions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("videoId");
        const count = parseInt(searchParams.get("count") || "6");

        if (!videoId) return NextResponse.json({ error: "Thiếu videoId" }, { status: 400 });

        // Luôn lấy những câu hỏi mới nhất của video này
        const questions = await Question.find({ videoId }).sort({ createdAt: -1 }).limit(count);
        return NextResponse.json({ questions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
