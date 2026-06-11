import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email, token, password } = await req.json();

        if (!email || !token || !password) {
            return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Mật khẩu phải có ít nhất 6 ký tự" },
                { status: 400 }
            );
        }

        const resetToken = await PasswordResetToken.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!resetToken) {
            return NextResponse.json(
                { error: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" },
                { status: 400 }
            );
        }

        const isValid = await resetToken.compareToken(token);
        if (!isValid) {
            return NextResponse.json(
                { error: "Link đặt lại mật khẩu không hợp lệ" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            { password: hashedPassword }
        );

        await PasswordResetToken.deleteMany({ email: email.toLowerCase().trim() });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Lỗi reset-password:", error);
        return NextResponse.json({ error: "Lỗi server, vui lòng thử lại" }, { status: 500 });
    }
}
