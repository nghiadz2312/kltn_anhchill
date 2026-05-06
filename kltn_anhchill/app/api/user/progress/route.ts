import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import dbConnect from "@/lib/dbConnect";
import UserProgress from "@/models/UserProgress";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/progress
 * Lấy lịch sử làm bài của người dùng hiện tại.
 * userId được đọc trực tiếp từ JWT cookie (không phụ thuộc middleware).
 */
export async function GET(req: Request) {
    try {
        await dbConnect();

        // Đọc JWT token trực tiếp từ cookie
        const cookieStore = await cookies();
        const token = cookieStore.get("engchill-token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const JWT_SECRET = new TextEncoder().encode(
            process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
        );

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.userId as string;

        if (!userId) {
            return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
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

        const response = NextResponse.json({ progress });
        // Ép không cho cache ở bất kỳ cấp độ nào
        response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
