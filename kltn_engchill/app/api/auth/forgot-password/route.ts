import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { sendPasswordResetEmail } from "@/lib/sendPasswordResetEmail";

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { email } = await req.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Vui lòng nhập email" }, { status: 400 });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Trả về success dù email có tồn tại hay không — tránh email enumeration attack
        if (!user) {
            return NextResponse.json({ success: true });
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = await bcrypt.hash(rawToken, 10);

        await new PasswordResetToken({
            email: user.email,
            tokenHash,
        }).save();

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const resetLink = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

        await sendPasswordResetEmail(user.email, user.name, resetLink);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Lỗi forgot-password:", error);
        return NextResponse.json({ error: "Lỗi server, vui lòng thử lại" }, { status: 500 });
    }
}
