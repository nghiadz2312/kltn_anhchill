import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
);

/**
 * API lấy thông tin người dùng hiện tại đang đăng nhập.
 * 
 * Tại sao cần API này?
 * → Khi user tải lại trang (F5), React state bị reset về null.
 *   Component cần gọi API này để kiểm tra "tôi có đang đăng nhập không?"
 *   và lấy lại thông tin user từ token trong cookie.
 */
export async function GET(req: Request) {
    try {
        // Lấy token từ cookie
        const cookieHeader = req.headers.get("cookie") || "";
        const tokenMatch = cookieHeader.match(/engchill-token=([^;]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        // Giải mã và xác thực token
        const { payload } = await jwtVerify(token, JWT_SECRET);

        await dbConnect();
        const user = await User.findById(payload.userId);
        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
        });
    } catch {
        return NextResponse.json({ user: null }, { status: 401 });
    }
}
