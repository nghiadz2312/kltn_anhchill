import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

/**
 * API Hỗ trợ tạo chuỗi Bcrypt Hash cho KLTN
 * URL: /api/dev/hash?password=1234567
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const password = searchParams.get("password");

        if (!password) {
            return NextResponse.json(
                { error: "Vui lòng thêm tham số ?password= ví dụ: /api/dev/hash?password=1234567" },
                { status: 400 }
            );
        }

        const hash = await bcrypt.hash(password, 12);
        return NextResponse.json({
            password: password,
            hash: hash,
            guide: "Copy chuỗi trong phần 'hash' và dán vào trường password trên MongoDB."
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
