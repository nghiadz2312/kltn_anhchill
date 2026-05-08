import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const isAdmin = searchParams.get("admin") === "true";

        /**
         * 📚 GIẢI THÍCH CHO HỘI ĐỒNG (Tối ưu hiệu năng):
         * - Nếu là User thường: Ta dùng .select("-segments -script") để LOẠI BỎ 2 trường dữ liệu nặng.
         *   Giúp trang chủ tải cực nhanh ngay cả khi có hàng trăm video.
         * - Nếu là Admin: Ta lấy ĐẦY ĐỦ để kiểm tra trạng thái xử lý AI của video.
         * Đây gọi là kỹ thuật Selective Field Projection trong MongoDB.
         */
        const selectFields = isAdmin ? "" : "-segments -script";
        
        const videos = await Video.find({}).select(selectFields).sort({ createdAt: -1 });
        return NextResponse.json(videos);
    } catch (error) {
        return NextResponse.json({ error: "Lỗi DB" }, { status: 500 });
    }
}