import { NextResponse } from "next/server";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";
import { transcribeVideo } from "@/lib/whisper";
import { fetchFileFromUrl } from "@/lib/cloudinary";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

// Gọi lại Whisper cho video đã tồn tại — fetch audio từ Cloudinary URL về buffer rồi transcribe lại
export async function POST(req: Request) {
    const headersList = await headers();
    const role = headersList.get("x-user-role");
    if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await dbConnect();
        const { videoId } = await req.json();

        if (!videoId) {
            return NextResponse.json({ error: "Thiếu videoId" }, { status: 400 });
        }

        const video = await Video.findById(videoId);
        if (!video) {
            return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
        }

        console.log(`🔄 Re-processing: "${video.title}" (${videoId})`);

        let buffer: Buffer;
        const isCloudinary = video.videoUrl.startsWith("http");

        if (isCloudinary) {
            // ── TRƯỜNG HỢP 1: File đã trên Cloudinary ──
            console.log(`☁️ Đang lấy file từ Cloudinary...`);
            buffer = await fetchFileFromUrl(video.videoUrl);
        } else {
            // ── TRƯỜNG HỢP 2: File cục bộ (chỉ hoạt động ở localhost) ──
            const relativePath = video.videoUrl.replace(/^\//, "");
            let filePath = path.join(process.cwd(), "public", relativePath);

            if (!fs.existsSync(filePath)) {
                // Thử tìm trong thư mục public gốc
                const fileName = path.basename(video.videoUrl);
                filePath = path.join(process.cwd(), "public", fileName);
                
                if (!fs.existsSync(filePath)) {
                    throw new Error("Không tìm thấy file cục bộ. Vui lòng migrate sang Cloudinary trước.");
                }
            }
            
            console.log(`📂 Đang đọc file từ local storage...`);
            buffer = fs.readFileSync(filePath);
        }

        // ── BƯỚC 3: Gọi Whisper AI với BUFFER ──
        console.log(`🤖 Gửi buffer tới Whisper AI...`);
        const { fullText, segments } = await transcribeVideo(buffer, path.basename(video.videoUrl));

        if (!fullText || fullText.length < 10) {
            return NextResponse.json(
                { error: "AI không nhận diện được nội dung âm thanh." },
                { status: 422 }
            );
        }

        // ── BƯỚC 4: Cập nhật DB ──
        await Video.findByIdAndUpdate(videoId, {
            script: fullText,
            segments: segments,
        });

        return NextResponse.json({
            success: true,
            message: `Xử lý AI thành công!`,
            data: {
                videoId,
                segmentCount: segments.length,
            },
        });
    } catch (error: any) {
        console.error("Lỗi re-process:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
