import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Collection from "@/models/Collection";

export const dynamic = "force-dynamic";

/** GET /api/collections — Lấy tất cả bộ sưu tập */
export async function GET() {
    try {
        await dbConnect();
        const collections = await Collection.find({})
            .sort({ order: 1, createdAt: -1 })
            .populate("videos", "title level viewCount"); // Lấy thông tin cơ bản của video
        return NextResponse.json(collections);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/** POST /api/collections — Tạo bộ sưu tập mới (Admin) */
export async function POST(req: Request) {
    try {
        await dbConnect();
        const role = req.headers.get("x-user-role");
        if (role !== "admin") {
            return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
        }

        const { name, description, color, order } = await req.json();
        if (!name) {
            return NextResponse.json({ error: "Thiếu tên bộ sưu tập" }, { status: 400 });
        }

        const collection = await Collection.create({ name, description, color, order });
        return NextResponse.json(collection, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
