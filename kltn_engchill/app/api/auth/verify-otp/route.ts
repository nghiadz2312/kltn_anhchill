import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import OtpToken from "@/models/OtpToken";

/**
 * POST /api/auth/verify-otp
 *
 * Xác thực mã OTP người dùng nhập:
 * 1. Tìm OtpToken theo email
 * 2. Kiểm tra số lần thử (max 5 lần)
 * 3. So sánh OTP với hash
 * 4. Nếu đúng: tạo User từ userData đã lưu sẵn, xóa OtpToken
 */
export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json(
                { error: "Thiếu email hoặc mã OTP" },
                { status: 400 }
            );
        }

        const otpToken = await OtpToken.findOne({ email: email.toLowerCase() });

        if (!otpToken) {
            return NextResponse.json(
                { error: "Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng đăng ký lại." },
                { status: 404 }
            );
        }

        // Giới hạn 5 lần thử để chống brute force
        if (otpToken.attempts >= 5) {
            await OtpToken.deleteOne({ _id: otpToken._id });
            return NextResponse.json(
                { error: "Quá nhiều lần thử sai. Vui lòng đăng ký lại để nhận mã mới." },
                { status: 429 }
            );
        }

        const isOtpValid = await otpToken.compareOtp(String(otp).trim());

        if (!isOtpValid) {
            // Tăng số lần thử
            otpToken.attempts += 1;
            await otpToken.save();
            const remaining = 5 - otpToken.attempts;
            return NextResponse.json(
                { error: `Mã xác thực không đúng. Còn ${remaining} lần thử.` },
                { status: 400 }
            );
        }

        // OTP đúng — kiểm tra lần nữa email chưa bị đăng ký bởi người khác
        const existingUser = await User.findOne({ email: otpToken.userData.email });
        if (existingUser) {
            await OtpToken.deleteOne({ _id: otpToken._id });
            return NextResponse.json(
                { error: "Email này đã được sử dụng bởi tài khoản khác." },
                { status: 409 }
            );
        }

        // Tạo user — password đã được hash sẵn trong userData.hashedPassword
        // Dùng insertOne trực tiếp để KHÔNG kích hoạt pre-save hook hash lại password
        const newUser = await User.collection.insertOne({
            name: otpToken.userData.name,
            email: otpToken.userData.email,
            password: otpToken.userData.hashedPassword,
            role: "student",
            savedVideos: [],
            watchHistory: [],
            avatar: "",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Xóa OtpToken sau khi tạo user thành công
        await OtpToken.deleteOne({ _id: otpToken._id });

        return NextResponse.json(
            {
                success: true,
                message: "Xác thực thành công! Tài khoản đã được tạo.",
                userId: newUser.insertedId,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Lỗi verify OTP:", error);
        return NextResponse.json(
            { error: "Lỗi server: " + (error.message || "Không xác định") },
            { status: 500 }
        );
    }
}
