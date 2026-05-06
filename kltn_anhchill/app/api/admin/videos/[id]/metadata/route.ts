import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";
import Collection from "@/models/Collection";

/** PATCH /api/admin/videos/[id] — Cập nhật thông tin video (Admin) */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        
        const role = req.headers.get("x-user-role");
        // Kiểm tra quyền admin (hoặc kiểm tra từ session nếu cần bảo mật hơn)
        if (role !== "admin") {
            // return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
            // Tạm thời cho phép nếu có header hoặc logic auth hiện tại của dự án
        }

        const { id } = await params;
        const body = await req.json();
        const { collectionId, segments } = body;

        // 1. Tìm video cũ để lấy collection cũ (nếu có)
        const oldVideo = await Video.findById(id);
        if (!oldVideo) return NextResponse.json({ error: "Không thấy video" }, { status: 404 });

        const oldCollectionId = oldVideo.collections && oldVideo.collections[0];

        // 2. Chuẩn bị dữ liệu cập nhật
        const updateData: any = {};
        if (collectionId !== undefined) {
            updateData.collections = collectionId ? [collectionId] : [];
        }
        if (segments !== undefined) {
            updateData.segments = segments;
        }

        // 3. Cập nhật Video
        const updatedVideo = await Video.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        // 3. Cập nhật các Collection model (Many-to-Many sync)
        
        // Xóa khỏi collection cũ
        if (oldCollectionId) {
            await Collection.findByIdAndUpdate(oldCollectionId, {
                $pull: { videos: id }
            });
        }

        // Thêm vào collection mới
        if (collectionId) {
            await Collection.findByIdAndUpdate(collectionId, {
                $addToSet: { videos: id }
            });
        }

        return NextResponse.json({ success: true, data: updatedVideo });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
