import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * 
 * Middleware là gì?
 * → Middleware là lớp "bảo vệ" chạy TRƯỚC KHI request đến được route handler.
 *   Mọi request đến server đều đi qua middleware trước.
 * 
 * Tại sao cần Middleware thay vì kiểm tra trong từng page?
 * → Nếu kiểm tra trong từng page, lỡ quên 1 page là có lỗ hổng bảo mật.
 *   Middleware tập trung logic bảo vệ ở 1 nơi → không bỏ sót.
 *   Đây là nguyên tắc DRY (Don't Repeat Yourself) trong lập trình.
 * 
 * Luồng hoạt động:
 * User truy cập /admin → Middleware bắt request → Kiểm tra JWT cookie
 * → Có token hợp lệ + role=admin → Cho qua
 * → Không có token hoặc role=student → Redirect về /login
 */

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
);

export async function middleware(request: NextRequest) {
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
    const isAuthRoute = pathname.startsWith("/login") ||
        pathname.startsWith("/register");

    // Không có token
    if (!token) {
        if (isProtectedRoute || isAdminRoute) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    // Có token → giải mã và xác thực
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);

        if (isAuthRoute) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        if (isAdminRoute && payload.role !== "admin") {
            return NextResponse.redirect(new URL("/", request.url));
        }

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-user-id", String(payload.userId));
        requestHeaders.set("x-user-role", String(payload.role));
        requestHeaders.set("x-user-name", encodeURIComponent(String(payload.name)));

        return NextResponse.next({ request: { headers: requestHeaders } });
    } catch (error: any) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", "token_invalid_" + error.message);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("engchill-token");
        return response;
    }
}

/**
 * config.matcher: Middleware chỉ chạy trên các route này.
 * Không chạy trên: _next/static, _next/image, favicon.ico, file trong public/
 */
export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
