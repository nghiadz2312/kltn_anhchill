import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Tại sao cần API riêng cho từng video, không dùng GET /api/videos rồi filter?
 *
 * Vấn đề cũ (Watch page cũ):
 *   fetch('/api/videos')          → Lấy TẤT CẢ video (kể cả segments dài)
 *   .then(data => data.find(...)) → Lọc ở client
 *
 * Vấn đề:
 *   - Lãng phí băng thông: tải 50 video nhưng chỉ dùng 1
 *   - Chậm: mỗi video có thể 100+ segments
 *   - Không scale: càng nhiều video càng chậm
 *
 * Giải pháp: GET /api/videos/[id]
 *   → Chỉ lấy đúng 1 video cần thiết từ DB
 *   → Đây là RESTful API design chuẩn
 */

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await dbConnect();

        const video = await Video.findById(id).lean();
        // .lean() → trả về plain JS object thay vì Mongoose document
        //           → nhanh hơn vì không cần tạo các method của Mongoose

        if (!video) {
            return NextResponse.json(
                { error: "Không tìm thấy bài học" },
                { status: 404 }
            );
        }

        // Tăng view count (không cần await — fire and forget)
        Video.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

        /**
         * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
         *
         * Tại sao trả về link videoUrl gốc?
         * 1. Đơn giản hóa kiến trúc: Trực tiếp sử dụng link file cục bộ (/uploads/...) giúp giảm tải cho server.
         * 2. Trình duyệt hỗ trợ tốt: Các trình duyệt hiện đại đều hỗ trợ phát file mp3/mp4 cục bộ rất tốt.
         * 3. Tính độc lập: Không phụ thuộc vào API bên thứ 3 (như YouTube) giúp hệ thống chạy ổn định 100%.
         */
        return NextResponse.json(video);
    } catch (error: any) {
        // Nếu id không đúng format ObjectId, Mongoose sẽ throw CastError
        if (error.name === "CastError") {
            return NextResponse.json(
                { error: "ID video không hợp lệ" },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
    }
}
