import { NextResponse } from "next/server";

/**
 * API Đăng xuất — Xóa cookie JWT khỏi trình duyệt
 * 
 * Tại sao đơn giản vậy?
 * → JWT là stateless — server không lưu trạng thái session.
 *   Để logout, chỉ cần xóa cookie chứa token ở phía client.
 *   Sau khi cookie bị xóa, mọi request tiếp theo sẽ không có token
 *   → middleware chặn lại → người dùng bị đẩy về trang login.
 */
export async function POST() {
    const response = NextResponse.json({ success: true, message: "Đăng xuất thành công" });
    
    // Ghi đè cookie bằng giá trị rỗng và maxAge=0 → trình duyệt tự xóa
    response.cookies.set("engchill-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
    });

    return response;
}
