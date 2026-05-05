import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * 
 * API Login xử lý đăng nhập và trả về JWT token.
 * 
 * JWT là gì? (JSON Web Token)
 * → JWT là một chuỗi mã hóa chứa thông tin người dùng (id, role...).
 *   Sau khi đăng nhập, server trả JWT về client.
 *   Client lưu JWT (trong cookie) và gửi kèm mọi request tiếp theo.
 *   Server đọc JWT để biết ai đang gửi request mà KHÔNG cần query DB.
 * 
 * Tại sao dùng jose thay vì jsonwebtoken?
 * → Next.js Middleware chạy trên Edge Runtime, không hỗ trợ Node.js modules.
 *   jose là thư viện thuần Web Crypto API, chạy được trên cả Node.js lẫn Edge.
 * 
 * Tại sao lưu JWT trong Cookie thay vì localStorage?
 * → localStorage dễ bị tấn công XSS (hacker inject script đọc token).
 *   Cookie với httpOnly=true thì JavaScript KHÔNG đọc được → an toàn hơn.
 */

// Lấy secret key từ .env.local — KHÔNG bao giờ commit secret key lên GitHub!
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
);

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email, password } = await req.json();

        // --- BƯỚC 1: VALIDATE ---
        if (!email || !password) {
            return NextResponse.json(
                { error: "Vui lòng nhập email và mật khẩu" },
                { status: 400 }
            );
        }

        // --- BƯỚC 2: TÌM USER TRONG DB ---
        /**
         * .select('+password') → Vì password có select:false trong schema,
         * cần gọi tường minh để lấy trường này khi login.
         */
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

        if (!user) {
            /**
             * Tại sao không ghi "Email không tồn tại"?
             * → Security concern: nếu nói rõ "email không tồn tại",
             *   hacker biết email nào đã đăng ký → enumerate accounts.
             *   Thông báo mơ hồ "Sai thông tin đăng nhập" an toàn hơn.
             */
            return NextResponse.json(
                { error: "Email hoặc mật khẩu không đúng" },
                { status: 401 } // 401 = Unauthorized
            );
        }

        // --- BƯỚC 2.5: CẤP QUYỀN ADMIN TỰ ĐỘNG CHO CHỦ DỰ ÁN ---
        if (email.toLowerCase() === "nghia23122004@gmail.com" && user.role !== "admin") {
            user.role = "admin";
            await user.save();
        }

        // --- BƯỚC 3: KIỂM TRA MẬT KHẨU ---
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return NextResponse.json(
                { error: "Email hoặc mật khẩu không đúng" },
                { status: 401 }
            );
        }

        // --- BƯỚC 4: TẠO JWT TOKEN ---
        /**
         * Payload của JWT chứa:
         * - userId: để sau này query DB lấy thông tin chi tiết
         * - role: để middleware kiểm tra quyền mà không cần query DB
         * - name, email: thông tin hiển thị trên UI
         * 
         * Thời hạn token: 7 ngày → sau 7 ngày phải đăng nhập lại.
         */
        const token = await new SignJWT({
            userId: user._id.toString(),
            role: user.role,
            name: user.name,
            email: user.email,
        })
            .setProtectedHeader({ alg: "HS256" }) // Thuật toán ký: HMAC SHA-256
            .setIssuedAt() // Thời điểm tạo token
            .setExpirationTime("7d") // Hết hạn sau 7 ngày
            .sign(JWT_SECRET);

        // --- BƯỚC 5: LƯU TOKEN VÀO COOKIE ---
        const response = NextResponse.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

        /**
         * Cấu hình cookie bảo mật:
         * - httpOnly: true  → JS không đọc được (chống XSS)
         * - secure: true    → Chỉ gửi qua HTTPS (khi production)
         * - sameSite: strict → Chỉ gửi khi request từ cùng domain (chống CSRF)
         * - maxAge: 7 ngày  → Cookie tự xóa sau 7 ngày
         */
        response.cookies.set("engchill-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 7, // 7 ngày tính bằng giây
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
