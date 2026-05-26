import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const isAdmin = searchParams.get("admin") === "true";

        // Admin mode: dùng aggregate để tính segmentCount rồi loại bỏ segments+script khỏi response
        // Giữ payload nhỏ — khi cần sửa transcript mới gọi riêng /api/admin/videos/[id]
        if (isAdmin) {
            const videos = await Video.aggregate([
                { $sort: { createdAt: -1 } },
                { $addFields: { segmentCount: { $size: { $ifNull: ["$segments", []] } } } },
                { $project: { script: 0, segments: 0 } },
            ]);
            return NextResponse.json(videos);
        }

        // User thường: loại bỏ segments + script (giữ nguyên logic cũ)
        const videos = await Video.find({}).select("-segments -script").sort({ createdAt: -1 });
        return NextResponse.json(videos);
    } catch (error) {
        return NextResponse.json({ error: "Lỗi DB" }, { status: 500 });
    }
}