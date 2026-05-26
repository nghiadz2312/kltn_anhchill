import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

// Đăng ký tài khoản — validate, kiểm tra email trùng, tạo user (bcrypt hash qua pre-save hook)
export async function POST(req: Request) {
    try {
        await dbConnect();

        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Vui lòng điền đầy đủ thông tin" },
                { status: 400 } // 400 = Bad Request
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Mật khẩu phải có ít nhất 6 ký tự" },
                { status: 400 }
            );
        }

        // Validate email format bằng regex đơn giản
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Email không hợp lệ" },
                { status: 400 }
            );
        }

        // Check trước để trả lỗi thân thiện, tránh lỗi duplicate key 11000 từ MongoDB
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: "Email này đã được sử dụng" },
                { status: 409 } // 409 = Conflict
            );
        }

        // User.create() tự kích hoạt pre-save hook → bcrypt hash password trước khi lưu
        const newUser = await User.create({ name, email, password });
        return NextResponse.json(
            {
                success: true,
                message: "Tạo tài khoản thành công!",
                user: {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                },
            },
            { status: 201 } // 201 = Created
        );
    } catch (error: any) {
        console.error("Lỗi đăng ký:", error);
        return NextResponse.json(
            { error: "Lỗi server: " + (error.message || "Không xác định") },
            { status: 500 }
        );
    }
}
