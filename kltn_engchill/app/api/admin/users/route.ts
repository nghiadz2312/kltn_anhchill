import { NextResponse } from "next/server";
import { headers } from "next/headers";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

// GET /api/admin/users — Lấy toàn bộ danh sách user (không giới hạn 50)
export async function GET(req: Request) {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");

    const filter: any = { role: "student" };
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("name email createdAt avatar role")
            .lean(),
        User.countDocuments(filter),
    ]);

    return NextResponse.json({ users, total, page, limit });
}

// DELETE /api/admin/users — Xóa hàng loạt user theo ids hoặc pattern email/name
export async function DELETE(req: Request) {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();

    // Xóa theo danh sách ID cụ thể
    if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
        const result = await User.deleteMany({
            _id: { $in: body.ids },
            role: "student", // Chỉ xóa student, không bao giờ xóa admin
        });
        return NextResponse.json({ deleted: result.deletedCount });
    }

    // Xóa theo pattern email (regex)
    if (body.emailPattern) {
        const result = await User.deleteMany({
            email: { $regex: body.emailPattern, $options: "i" },
            role: "student",
        });
        return NextResponse.json({ deleted: result.deletedCount });
    }

    // Xóa theo pattern tên (regex)
    if (body.namePattern) {
        const result = await User.deleteMany({
            name: { $regex: body.namePattern, $options: "i" },
            role: "student",
        });
        return NextResponse.json({ deleted: result.deletedCount });
    }

    return NextResponse.json({ error: "Thiếu điều kiện xóa" }, { status: 400 });
}
