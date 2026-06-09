import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";
import { uploadAudioToCloudinary } from "@/lib/cloudinary";

// Script one-time: tìm video có URL local trong DB, upload lên Cloudinary, cập nhật URL mới
export async function GET() {
    try {
        await dbConnect();

        // Lấy tất cả video có URL cục bộ (bắt đầu bằng "/" nhưng không phải "https://")
        const localVideos = await Video.find({
            videoUrl: { $regex: /^\/(?!\/|http)/ },
        });

        if (localVideos.length === 0) {
            return NextResponse.json({
                message: "Không có video nào cần migrate. Tất cả đã dùng Cloudinary!",
                count: 0,
            });
        }

        const results = [];
        const publicDir = path.join(process.cwd(), "public");

        for (const video of localVideos) {
            const localFileName = video.videoUrl.replace(/^\//, ""); // bỏ "/" đầu
            const localFilePath = path.join(publicDir, localFileName);

            // Kiểm tra file có tồn tại không
            if (!fs.existsSync(localFilePath)) {
                results.push({
                    id: video._id,
                    title: video.title,
                    status: "skipped",
                    reason: `File không tồn tại: ${localFilePath}`,
                });
                continue;
            }

            try {
                // Đọc file thành buffer
                const buffer = fs.readFileSync(localFilePath);
                const fileName = `migrate-${Date.now()}-${localFileName}`;

                console.log(`📤 Đang upload "${video.title}" lên Cloudinary...`);

                // Upload lên Cloudinary
                const cloudinaryUrl = await uploadAudioToCloudinary(buffer, fileName);

                // Cập nhật MongoDB
                await Video.findByIdAndUpdate(video._id, {
                    videoUrl: cloudinaryUrl,
                });

                console.log(`✅ "${video.title}" đã migrate thành công!`);

                results.push({
                    id: video._id,
                    title: video.title,
                    status: "success",
                    oldUrl: video.videoUrl,
                    newUrl: cloudinaryUrl,
                });
            } catch (err: any) {
                results.push({
                    id: video._id,
                    title: video.title,
                    status: "error",
                    reason: err.message,
                });
            }
        }

        const successCount = results.filter(r => r.status === "success").length;
        const failCount = results.filter(r => r.status === "error" || r.status === "skipped").length;

        return NextResponse.json({
            message: `Migration hoàn tất! ${successCount} thành công, ${failCount} thất bại.`,
            results,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
