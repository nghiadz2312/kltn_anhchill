import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import UserProgress from "@/models/UserProgress";
import Question from "@/models/Question";
import Video from "@/models/Video";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill
 * Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562 - Đại học Thăng Long
 * 
 * API này dùng để lấy lại chi tiết một bài làm cũ.
 * 
 * TẠI SAO CẦN?
 * Khi người dùng vào Dashboard và bấm "Xem lại", hệ thống cần biết:
 * 1. Họ đã trả lời những gì? (Lấy từ UserProgress)
 * 2. Câu hỏi gốc và các phương án là gì? (Lấy từ Question model bằng cách populate)
 */

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const attemptId = searchParams.get("attemptId");

        if (!attemptId) return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });

        // Lấy record tiến độ và populate thông tin video + câu hỏi
        const progress = await UserProgress.findById(attemptId)
            .populate("videoId", "title")
            .populate("answers.questionId");

        if (!progress) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Format lại dữ liệu giống như cấu trúc trang Exercise cần
        const results = progress.answers.map((ans: any) => {
            const q = ans.questionId;
            // 📘 KIỂM TRA NULL: Nếu câu hỏi gốc đã bị xóa khỏi DB
            if (!q) {
                return {
                    questionId: ans._id,
                    isCorrect: ans.isCorrect,
                    userAnswer: ans.userAnswer,
                    correctAnswer: "Dữ liệu câu hỏi gốc không còn",
                    explanation: "",
                    questionText: "Câu hỏi này đã bị xóa khỏi hệ thống",
                    type: "unknown"
                };
            }
            return {
                questionId: q._id,
                isCorrect: ans.isCorrect,
                userAnswer: ans.userAnswer,
                correctAnswer: q.type === 'multiple_choice' ? (q.options[q.correctIndex] || "N/A") : q.answer,
                explanation: q.explanation,
                questionText: q.type === 'multiple_choice' ? q.question : q.blankedSentence,
                type: q.type,
                options: q.options 
            };
        });

        return NextResponse.json({
            score: progress.score,
            results: results,
            questions: progress.answers.map((ans: any) => ans.questionId).filter(Boolean), 
            videoTitle: progress.videoId?.title,
            feedback: progress.score >= 80 ? "Xuất sắc!" : progress.score >= 50 ? "Khá tốt!" : "Cần cố gắng thêm!"
        });

    } catch (error) {
        console.error("LỖI API RESULTS:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
