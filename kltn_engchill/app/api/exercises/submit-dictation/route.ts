import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import dbConnect from "@/lib/dbConnect";
import UserProgress from "@/models/UserProgress";


export async function POST(req: Request) {
    try {
        await dbConnect();

        // 1. Xác thực người dùng qua Cookie
        const cookieStore = await cookies();
        const token = cookieStore.get("engchill-token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Chưa đăng nhập, không thể lưu tiến trình" }, { status: 401 });
        }

        const JWT_SECRET = new TextEncoder().encode(
            process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
        );

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.userId as string;

        if (!userId) {
            return NextResponse.json({ error: "Token xác thực không hợp lệ" }, { status: 401 });
        }

        // 2. Lấy dữ liệu gửi từ Client
        const { videoId, score, correctCount, totalQuestions, answers } = await req.json();

        if (!videoId || score === undefined || correctCount === undefined || !totalQuestions) {
            return NextResponse.json({ error: "Thiếu thông tin bài làm" }, { status: 400 });
        }

        // 3. Lưu bản ghi tiến trình làm bài
        const progress = await UserProgress.create({
            userId,
            videoId,
            answers: answers.map((ans: any) => ({
                userAnswer: ans.userAnswer,
                isCorrect: ans.isCorrect
            })),
            score,
            totalQuestions,
            correctCount
        });

        return NextResponse.json({ success: true, progressId: progress._id });

    } catch (error: any) {
        console.error("LỖI LƯU TIẾN TRÌNH DICTATION:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
