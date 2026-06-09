import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
);

export async function GET(req: Request) {
    try {
        await dbConnect();
        
        // Liệt kê tất cả user đang có
        const totalUsers = await User.countDocuments();

        // 1. Lấy token hiện tại
        const cookieHeader = req.headers.get("cookie") || "";
        const tokenMatch = cookieHeader.match(/engchill-token=([^;]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        if (!token) {
            return NextResponse.json({ error: "Bạn chưa đăng nhập. Vui lòng đăng nhập trước khi chạy API fix." }, { status: 400 });
        }

        // 2. Decode token
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const user = await User.findById(payload.userId);
        
        if (!user) {
            return NextResponse.json({ error: "Không tìm thấy User trong DB!" }, { status: 404 });
        }

        // 3. Ép kiểu Admin
        user.role = "admin";
        await user.save();

        // 4. Sinh lại Token MỚI NHẤT mang nhãn Admin
        const newToken = await new SignJWT({
            userId: user._id.toString(),
            role: "admin", // <-- Nâng quyền ngay trong token
            name: user.name,
            email: user.email,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(JWT_SECRET);

        // 5. Cài đè cookie & Redirect thẳng vào Admin
        const url = new URL("/admin", req.url);
        const response = NextResponse.redirect(url);
        response.cookies.set("engchill-token", newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });

        return response;
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
