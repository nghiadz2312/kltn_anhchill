import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * 
 * Proxy (tên mới của Middleware trong Next.js 16) là gì?
 * → Proxy là lớp "bảo vệ" chạy TRƯỚC KHI request đến được route handler.
 *   Mọi request đến server đều đi qua proxy trước.
 * 
 * Tại sao cần Proxy thay vì kiểm tra trong từng page?
 * → Nếu kiểm tra trong từng page, lỡ quên 1 page là có lỗ hổng bảo mật.
 *   Proxy tập trung logic bảo vệ ở 1 nơi → không bỏ sót.
 *   Đây là nguyên tắc DRY (Don't Repeat Yourself) trong lập trình.
 * 
 * Luồng hoạt động:
 * User truy cập /admin → Proxy bắt request → Kiểm tra JWT cookie
 * → Có token hợp lệ + role=admin → Cho qua
 * → Không có token hoặc role=student → Redirect về /login
 */

export async function proxy(request: NextRequest) {
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
         * Đính kèm thông tin user vào request header.
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
 * config.matcher: Proxy chỉ chạy trên các route cần kiểm tra quyền.
 * Các trang công khai như trang chủ (/) sẽ KHÔNG đi qua proxy.
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
