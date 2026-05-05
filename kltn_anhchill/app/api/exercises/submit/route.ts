import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Question from "@/models/Question";
import UserProgress from "@/models/UserProgress";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * POST /api/exercises/submit
 * Body: { videoId, userId, answers: [{ questionId, userAnswer }] }
 *
 * THUẬT TOÁN CHẤM ĐIỂM:
 *
 * 1. Với câu trắc nghiệm (multiple_choice):
 *    → So sánh index người dùng chọn với correctIndex trong DB
 *
 * 2. Với câu điền từ (fill_blank):
 *    → Normalize cả 2 chuỗi (lowercase, trim, xóa dấu câu)
 *    → So sánh để tránh sai vì chữ hoa/thường hay khoảng trắng thừa
 *
 * Score = (correctCount / totalQuestions) × 100
 */
export async function POST(req: Request) {
    try {
        await dbConnect();

        const { videoId, userId, answers } = await req.json();
        // answers = [{ questionId: "...", userAnswer: "..." }, ...]

        if (!videoId || !answers?.length) {
            return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
        }

        // Lấy tất cả câu hỏi của video này từ DB để chấm
        const questionIds = answers.map((a: any) => a.questionId);
        const questions = await Question.find({ _id: { $in: questionIds } });

        // Map để tra cứu nhanh theo id
        const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

        // ── CHẤM TỪNG CÂU ──
        let correctCount = 0;
        const gradedAnswers = answers.map((answer: any) => {
            const question = questionMap.get(answer.questionId);
            if (!question) return { ...answer, isCorrect: false };

            let isCorrect = false;

            if (question.type === "multiple_choice") {
                // So sánh index: "0", "1", "2", "3"
                isCorrect = parseInt(answer.userAnswer) === question.correctIndex;

            } else if (question.type === "fill_blank") {
                // Normalize: xóa khoảng trắng, lowercase, bỏ dấu câu cuối
                const normalize = (s: string) =>
                    s.trim().toLowerCase().replace(/[.,!?;:]$/, "");
                isCorrect = normalize(answer.userAnswer) === normalize(question.answer);
            }

            if (isCorrect) correctCount++;
            return { questionId: answer.questionId, userAnswer: answer.userAnswer, isCorrect };
        });

        const totalQuestions = answers.length;
        const score = Math.round((correctCount / totalQuestions) * 100);

        // ── LƯU KẾT QUẢ VÀO DB (nếu có userId) ──
        if (userId) {
            await UserProgress.create({
                userId,
                videoId,
                answers: gradedAnswers,
                score,
                totalQuestions,
                correctCount,
            });
        }

        // ── TRẢ KẾT QUẢ CHI TIẾT ──
        // Bao gồm đáp án đúng và giải thích → người dùng học được từ sai
        const detailedResults = gradedAnswers.map((ga: any) => {
            const question = questionMap.get(ga.questionId);
            return {
                ...ga,
                correctAnswer: question?.type === "multiple_choice"
                    ? question?.options?.[question.correctIndex]
                    : question?.answer,
                explanation: question?.explanation || question?.hint || "",
                questionText: question?.question || question?.blankedSentence,
                type: question?.type,
                options: question?.options,
            };
        });

        return NextResponse.json({
            score,
            correctCount,
            totalQuestions,
            results: detailedResults,
            // Nhận xét theo điểm
            feedback:
                score >= 80 ? "🎉 Xuất sắc! Bạn nắm bài rất tốt!" :
                score >= 60 ? "👍 Khá tốt! Còn một vài điểm cần ôn lại." :
                score >= 40 ? "📚 Cần cố gắng thêm. Hãy nghe lại bài." :
                              "💪 Đừng nản! Nghe lại và thử làm lần nữa nhé!",
        });
    } catch (error: any) {
        console.error("Lỗi chấm bài:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
