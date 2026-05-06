import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Collection from "@/models/Collection";
import Video from "@/models/Video";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * API này dùng để khởi tạo dữ liệu mặc định cho tính năng Bộ sưu tập.
 * 1. Tạo bộ sưu tập "Nhạc" nếu chưa có.
 * 2. Gán tất cả video hiện tại vào bộ sưu tập "Nhạc".
 */
export async function GET() {
    try {
        await dbConnect();

        // 1. Tìm hoặc tạo bộ sưu tập "Nhạc"
        let musicCol = await Collection.findOne({ name: "Nhạc" });
        if (!musicCol) {
            musicCol = await Collection.create({
                name: "Nhạc",
                description: "Các bài học qua bài hát sôi động",
                color: "blue",
                order: 1
            });
        }

        // 2. Lấy tất cả video chưa thuộc collection nào
        const videos = await Video.find({
            $or: [
                { collections: { $exists: false } },
                { collections: { $size: 0 } }
            ]
        });

        // 3. Cập nhật từng video
        const videoIds = videos.map(v => v._id);
        
        // Cập nhật Video: thêm ID của collection vào mảng collections
        await Video.updateMany(
            { _id: { $in: videoIds } },
            { $addToSet: { collections: musicCol._id } }
        );

        // Cập nhật Collection: thêm các videoIds vào mảng videos
        await Collection.findByIdAndUpdate(musicCol._id, {
            $addToSet: { videos: { $each: videoIds } }
        });

        return NextResponse.json({
            success: true,
            message: `Đã cập nhật ${videoIds.length} video vào bộ sưu tập "Nhạc"`,
            collectionId: musicCol._id
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
