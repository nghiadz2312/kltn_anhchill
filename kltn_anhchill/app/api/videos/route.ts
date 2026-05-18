import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const isAdmin = searchParams.get("admin") === "true";

        /**
         * 📚 GIẢI THÍCH CHO HỘI ĐỒNG (Tối ưu hiệu năng):
         * 
         * Trước đây: Admin fetch toàn bộ video kèm cả `segments` + `script` (rất nặng, chậm).
         * Vấn đề: `segments` là mảng chứa hàng trăm câu với timestamp → dữ liệu khổng lồ.
         * 
         * Giải pháp: Dùng MongoDB Aggregation Pipeline:
         * - $addFields: Tính `segmentCount` = số phần tử trong mảng segments
         * - $project: Loại bỏ hoàn toàn `segments` và `script` khỏi response
         * 
         * Kết quả: Admin chỉ nhận metadata nhẹ + số lượng segments.
         * Khi cần sửa transcript, frontend gọi riêng /api/admin/videos/[id] để lấy đầy đủ.
         */
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