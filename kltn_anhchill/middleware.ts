import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * 
 * Middleware (Bộ lọc trung gian) là gì?
 * → Middleware là lớp "bảo vệ" chạy TRƯỚC KHI request đến được route handler (API hoặc Page).
 *   Mọi request đến server (khớp với matcher) đều đi qua middleware trước.
 * 
 * Tại sao cần Middleware thay vì kiểm tra trong từng page/API?
 * → Nếu kiểm tra thủ công ở từng trang hoặc API, lỡ quên 1 nơi sẽ tạo ra lỗ hổng bảo mật.
 *   Middleware tập trung logic bảo vệ ở 1 nơi duy nhất → an toàn, không bỏ sót.
 *   Đây là nguyên tắc DRY (Don't Repeat Yourself) trong kỹ nghệ phần mềm.
 * 
 * Luồng hoạt động:
 * 1. User gửi request truy cập trang/API (ví dụ: /admin)
 * 2. Middleware bắt request → Đọc JWT token từ cookie `engchill-token`.
 * 3. Nếu không có token:
 *    - Nếu là trang bảo mật hoặc admin: Redirect về trang `/login`.
 * 4. Nếu có token:
 *    - Giải mã token bằng JWT_SECRET để lấy payload (userId, role, name, email).
 *    - Nếu truy cập trang admin (`/admin` hoặc `/api/admin`) mà role KHÔNG PHẢI "admin" → Redirect về trang chủ `/`.
 *    - Đính kèm thông tin user (id, role, name) vào request headers để các API phía sau sử dụng ngay mà không cần giải mã lại.
 */

export async function middleware(request: NextRequest) {
    const JWT_SECRET = new TextEncoder().encode(
        process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
    );

    const { pathname } = request.nextUrl;
    const token = request.cookies.get("engchill-token")?.value;

    // ─── TRƯỜNG HỢP 1: Route cần đăng nhập (bất kỳ role nào) ───
    const protectedRoutes = ["/profile", "/my-courses"];
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // ─── TRƯỜNG HỢP 2: Route chỉ dành cho Admin ───
    const isAdminRoute = pathname.startsWith("/admin") ||
        pathname.startsWith("/api/admin");

    // ─── TRƯỜNG HỢP 3: Route chỉ dành cho người CHƯA đăng nhập ───
    // (Đã đăng nhập rồi thì không cần vào trang login/register nữa)
    const isAuthRoute = pathname.startsWith("/login") ||
        pathname.startsWith("/register");

    // Không có token
    if (!token) {
        if (isProtectedRoute || isAdminRoute) {
            // Redirect về trang login, kèm theo URL gốc để sau login quay lại
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next(); // Cho qua (trang công khai)
    }

    // Có token → giải mã và xác thực
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);

        // Đã đăng nhập rồi mà vào /login hoặc /register → redirect về trang chủ
        if (isAuthRoute) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        // Vào route admin nhưng không phải admin → redirect về trang chủ
        if (isAdminRoute && payload.role !== "admin") {
            return NextResponse.redirect(new URL("/", request.url));
        }

        /**
         * Đính kèm thông tin user vào request header để các API xử lý phía sau lấy được ngay.
         * Tên user tiếng Việt có dấu (Unicode) không thể đưa trực tiếp vào HTTP Header,
         * phải dùng encodeURIComponent() để mã hóa thành dạng ASCII.
         */
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-user-id", String(payload.userId));
        requestHeaders.set("x-user-role", String(payload.role));
        requestHeaders.set("x-user-name", encodeURIComponent(String(payload.name)));

        return NextResponse.next({ request: { headers: requestHeaders } });
    } catch (error: any) {
        // Token không hợp lệ hoặc hết hạn → xóa cookie và redirect về login
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", "token_invalid_" + error.message);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("engchill-token");
        return response;
    }
}

/**
 * config.matcher: Middleware chỉ chạy trên các route được định nghĩa ở đây.
 * Các trang công khai khác sẽ KHÔNG đi qua middleware để tối ưu hiệu năng.
 */
export const config = {
    matcher: [
        "/profile/:path*",
        "/my-courses/:path*",
        "/admin/:path*",
        "/api/admin/:path*",
        "/login",
        "/register",
    ],
};
