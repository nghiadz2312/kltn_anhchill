import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";
import Question from "@/models/Question";
import UserProgress from "@/models/UserProgress";
import { deleteFromCloudinary } from "@/lib/cloudinary";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Cập nhật hàm DELETE để hỗ trợ Cloudinary:
 * 1. Nhận diện URL: Nếu là link Cloudinary, gọi API Cloudinary để xóa asset.
 * 2. An toàn trên Vercel: Wrap việc xóa file cục bộ trong try-catch vì 
 *    filesystem trên Vercel là read-only, có thể gây crash nếu không xử lý.
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const video = await Video.findById(id);
        if (!video) {
            return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
        }

        // 1. Xóa file vật lý hoặc Cloudinary asset
        if (video.videoUrl) {
            if (video.videoUrl.startsWith("http")) {
                // Xóa trên Cloudinary
                await deleteFromCloudinary(video.videoUrl);
            } else {
                // Xóa file cục bộ (chỉ chạy được ở local)
                try {
                    const fileName = video.videoUrl.replace(/^\//, "");
                    const filePath = path.join(process.cwd(), "public", fileName);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Đã xóa file local: ${filePath}`);
                    }
                } catch (fsError) {
                    console.warn("Không thể xóa file local (có thể đang chạy trên Vercel):", fsError);
                }
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
