import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

// Đăng nhập — xác thực thông tin, tạo JWT token, lưu vào cookie httpOnly
// Dùng jose thay jsonwebtoken vì middleware chạy trên Edge Runtime (không có Node.js modules)

// JWT_SECRET lấy từ .env — không commit lên GitHub
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
);

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Vui lòng nhập email và mật khẩu" },
                { status: 400 }
            );
        }

        // .select('+password') vì field này có select:false trong schema — phải gọi tường minh
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

        if (!user) {
            // Thông báo mơ hồ để tránh hacker enumerate accounts (biết email nào tồn tại)
            return NextResponse.json(
                { error: "Email hoặc mật khẩu không đúng" },
                { status: 401 } // 401 = Unauthorized
            );
        }

        // Tự động cấp quyền admin cho tài khoản chủ dự án nếu chưa có
        if (email.toLowerCase() === "nghia23122004@gmail.com" && user.role !== "admin") {
            user.role = "admin";
            await user.save();
        }

        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return NextResponse.json(
                { error: "Email hoặc mật khẩu không đúng" },
                { status: 401 }
            );
        }

        // Tạo JWT — payload chứa userId, role, name, email; hết hạn sau 7 ngày
        const token = await new SignJWT({
            userId: user._id.toString(),
            role: user.role,
            name: user.name,
            email: user.email,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(JWT_SECRET);

        const response = NextResponse.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

        // httpOnly=true → JS không đọc được (chống XSS); sameSite=strict → chống CSRF
        response.cookies.set("engchill-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });

        return response;
    } catch (error: any) {
        console.error("Lỗi đăng nhập:", error);
        return NextResponse.json(
            { error: "Lỗi server, vui lòng thử lại" },
            { status: 500 }
        );
    }
}
