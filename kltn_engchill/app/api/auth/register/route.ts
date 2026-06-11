import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import OtpToken from "@/models/OtpToken";
import { sendOtpEmail } from "@/lib/sendOtpEmail";

/**
 * POST /api/auth/register
 *
 * Luồng mới (có xác thực email):
 * 1. Validate input
 * 2. Kiểm tra email đã tồn tại chưa
 * 3. Hash password sẵn (tránh hash lại 2 lần ở bước verify)
 * 4. Sinh OTP 6 số ngẫu nhiên, hash OTP rồi lưu vào OtpToken
 * 5. Gửi email chứa OTP qua Resend
 * 6. Trả về success — CHƯA tạo User, chờ verify OTP
 */
export async function POST(req: Request) {
    try {
        await dbConnect();

        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Vui lòng điền đầy đủ thông tin" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Mật khẩu phải có ít nhất 6 ký tự" },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Email không hợp lệ" },
                { status: 400 }
            );
        }

        // Kiểm tra email đã được sử dụng bởi tài khoản đã xác thực
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: "Email này đã được sử dụng" },
                { status: 409 }
            );
        }

        // Hash password trước — khi verify OTP xong sẽ tạo user với hashedPassword này
        // (tránh lưu plaintext password vào DB dù chỉ tạm thời)
        const hashedPassword = await bcrypt.hash(password, 12);

        // Sinh OTP 6 chữ số ngẫu nhiên dạng chuỗi (có padding 0 nếu < 100000)
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await bcrypt.hash(otp, 10); // salt=10 đủ nhanh cho OTP ngắn hạn

        // Lưu OtpToken — pre-save hook sẽ xóa token cũ cùng email trước khi tạo mới
        await OtpToken.create({
            email: email.toLowerCase(),
            otpHash,
            userData: {
                name: name.trim(),
                email: email.toLowerCase(),
                hashedPassword,
            },
        });

        // Gửi email (nếu RESEND_API_KEY chưa set thì tự log ra console)
        await sendOtpEmail(email, name, otp);

        return NextResponse.json(
            { success: true, message: "Đã gửi mã xác thực về email của bạn!" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Lỗi đăng ký:", error);
        return NextResponse.json(
            { error: "Lỗi server: " + (error.message || "Không xác định") },
            { status: 500 }
        );
    }
}
