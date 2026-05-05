import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * 
 * API Register xử lý yêu cầu tạo tài khoản mới.
 * 
 * Luồng hoạt động:
 * 1. Client gửi POST request với { name, email, password }
 * 2. Server validate dữ liệu đầu vào
 * 3. Kiểm tra email đã tồn tại chưa
 * 4. Tạo User mới → bcrypt tự động hash mật khẩu (nhờ pre-save hook)
 * 5. Trả về thông báo thành công (KHÔNG trả về password)
 * 
 * Tại sao không trả về JWT token ngay sau đăng ký?
 * → Thiết kế này yêu cầu người dùng đăng nhập sau khi đăng ký,
 *   xác nhận họ nhớ mật khẩu vừa tạo.
 */
export async function POST(req: Request) {
    try {
        await dbConnect();

        const { name, email, password } = await req.json();

        // --- BƯỚC 1: VALIDATE DỮ LIỆU ---
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

        // --- BƯỚC 2: KIỂM TRA EMAIL ĐÃ TỒN TẠI ---
        /**
         * Tại sao cần bước này?
         * → Dù MongoDB có unique index trên email, nếu không check trước
         *   thì MongoDB sẽ throw lỗi 11000 (duplicate key) khó đọc.
         *   Kiểm tra trước để trả về thông báo lỗi thân thiện.
         */
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: "Email này đã được sử dụng" },
                { status: 409 } // 409 = Conflict
            );
        }

        // --- BƯỚC 3: TẠO TÀI KHOẢN MỚI ---
        /**
         * User.create() sẽ:
         * 1. Khởi tạo document mới
         * 2. Kích hoạt pre-save hook → bcrypt hash password
         * 3. Lưu vào MongoDB
         */
        const newUser = await User.create({ name, email, password });

        // Trả về response thành công — KHÔNG trả password
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
