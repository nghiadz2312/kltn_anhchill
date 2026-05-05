import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import UserProgress from "@/models/UserProgress";

/**
 * GET /api/user/progress
 * Lấy lịch sử làm bài của người dùng hiện tại.
 * userId được đọc từ header (do middleware đính kèm sau khi xác thực JWT).
 */
export async function GET(req: Request) {
    try {
        await dbConnect();

        // Middleware đã giải mã JWT và đính kèm userId vào header
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        /**
         * .populate("videoId", "title level")
         * → Thay vì chỉ trả về ObjectId của video,
         *   Mongoose sẽ tự động query Video collection
         *   và thay thế bằng object { _id, title, level }
         * Đây gọi là "populate" — tương tự JOIN trong SQL.
         */
        const progress = await UserProgress.find({ userId })
            .populate("videoId", "title level")
            .sort({ completedAt: -1 }) // Mới nhất trước
            .limit(20);                // Chỉ lấy 20 bài gần nhất

        return NextResponse.json({ progress });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
