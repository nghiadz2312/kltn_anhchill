import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import OtpToken from "@/models/OtpToken";
import { sendOtpEmail } from "@/lib/sendOtpEmail";

/**
 * POST /api/auth/resend-otp
 *
 * Gửi lại OTP mới cho email đã đăng ký nhưng chưa xác thực.
 * Giới hạn: phải chờ ít nhất 60 giây kể từ lần gửi trước.
 */
export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email, name } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Thiếu email" }, { status: 400 });
        }

        const otpToken = await OtpToken.findOne({ email: email.toLowerCase() });

        if (!otpToken) {
            return NextResponse.json(
                { error: "Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại." },
                { status: 404 }
            );
        }

        // Giới hạn gửi lại: phải chờ 60 giây
        const createdAt = new Date(otpToken.createdAt || otpToken._id.getTimestamp()).getTime();
        const now = Date.now();
        const secondsElapsed = (now - createdAt) / 1000;
        if (secondsElapsed < 60) {
            const waitSeconds = Math.ceil(60 - secondsElapsed);
            return NextResponse.json(
                { error: `Vui lòng chờ ${waitSeconds} giây trước khi gửi lại.` },
                { status: 429 }
            );
        }

        // Sinh OTP mới
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await bcrypt.hash(otp, 10);

        // Cập nhật OTP mới vào token hiện tại, reset attempts
        otpToken.otpHash = otpHash;
        otpToken.attempts = 0;
        otpToken.expiredAt = new Date(Date.now() + 10 * 60 * 1000);
        await otpToken.save();

        // Gửi email
        const displayName = name || otpToken.userData?.name || "bạn";
        await sendOtpEmail(email, displayName, otp);

        return NextResponse.json({ success: true, message: "Đã gửi lại mã xác thực!" });
    } catch (error: any) {
        console.error("Lỗi resend OTP:", error);
        return NextResponse.json(
            { error: "Lỗi server: " + (error.message || "Không xác định") },
            { status: 500 }
        );
    }
}
