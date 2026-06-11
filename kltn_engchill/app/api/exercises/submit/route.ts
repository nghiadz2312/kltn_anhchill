import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import dbConnect from "@/lib/dbConnect";
import Question from "@/models/Question";
import UserProgress from "@/models/UserProgress";

// Chấm bài: so sánh đáp án user với đáp án trong DB, tính score = (đúng/tổng) × 100
// fill_blank được normalize (lowercase, trim, bỏ dấu câu) trước khi so sánh
export async function POST(req: Request) {
    try {
        await dbConnect();

        const { videoId, answers } = await req.json();
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

        // ── LƯU KẾT QUẢ VÀO DB (Xác thực qua Cookie, không tin tưởng body) ──
        let userId: string | null = null;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get("engchill-token")?.value;
            if (token) {
                const JWT_SECRET = new TextEncoder().encode(
                    process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
                );
                const { payload } = await jwtVerify(token, JWT_SECRET);
                userId = payload.userId as string;
            }
        } catch (jwtError: any) {
            console.log("Chạy ở chế độ khách (không lưu tiến trình):", jwtError.message);
        }

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
