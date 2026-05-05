import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";
import Question from "@/models/Question";
import UserProgress from "@/models/UserProgress";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Khi xóa 1 video, cần xóa theo thứ tự (cascade delete):
 * 1. File vật lý trong /public       → giải phóng dung lượng ổ cứng
 * 2. Các câu hỏi liên quan (Question) → tránh "orphan data" trong DB
 * 3. Lịch sử làm bài (UserProgress)  → tránh "orphan data" trong DB
 * 4. Bản ghi Video trong MongoDB      → xóa cuối cùng
 *
 * "Orphan data" là dữ liệu mồ côi — tham chiếu đến document đã bị xóa,
 * gây lãng phí dung lượng và có thể gây lỗi khi query sau này.
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        // Tìm video trước để lấy tên file
        const video = await Video.findById(id);
        if (!video) {
            return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
        }

        // 1. Xóa file vật lý khỏi /public
        if (video.videoUrl) {
            const fileName = video.videoUrl.replace(/^\//, ""); // bỏ "/" đầu
            const filePath = path.join(process.cwd(), "public", fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Đã xóa file: ${filePath}`);
            }
        }

        // 2. Xóa câu hỏi bài tập liên quan
        const deletedQuestions = await Question.deleteMany({ videoId: id });

        // 3. Xóa lịch sử làm bài liên quan
        const deletedProgress = await UserProgress.deleteMany({ videoId: id });

        // 4. Xóa video khỏi DB
        await Video.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: "Đã xóa bài học thành công",
            deleted: {
                questions: deletedQuestions.deletedCount,
                progress: deletedProgress.deletedCount,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/videos/[id]
 * Cập nhật thông tin video (title, description, level)
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        // Chỉ cho phép cập nhật các trường an toàn
        const allowedFields = ["title", "description", "level", "thumbnail"];
        const updateData: Record<string, any> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) updateData[field] = body[field];
        }

        const updated = await Video.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) {
            return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
        }

        return NextResponse.json({ success: true, video: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
