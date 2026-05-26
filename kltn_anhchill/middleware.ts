import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Chạy trước mọi request — xác thực JWT, phân quyền, inject user info vào header cho các API sau dùng

export async function middleware(request: NextRequest) {
    const JWT_SECRET = new TextEncoder().encode(
        process.env.JWT_SECRET || "engchill-secret-key-change-in-production"
    );

    const { pathname } = request.nextUrl;
    const token = request.cookies.get("engchill-token")?.value;

    // Phân loại route để xử lý khác nhau
    const protectedRoutes = ["/profile", "/my-courses"];
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );
    const isAdminRoute = pathname.startsWith("/admin") ||
        pathname.startsWith("/api/admin");
    // /login và /register: nếu đã đăng nhập thì redirect về trang chủ
    const isAuthRoute = pathname.startsWith("/login") ||
        pathname.startsWith("/register");

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

        // Inject user info vào header để các API sau dùng mà không cần query DB lại
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-user-id", String(payload.userId));
        requestHeaders.set("x-user-role", String(payload.role));
        // encodeURIComponent vì tên tiếng Việt có dấu không đưa thẳng vào HTTP header được
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
