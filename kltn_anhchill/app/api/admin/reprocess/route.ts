import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { transcribeVideo } from "@/lib/whisper";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Tại sao loại bỏ hỗ trợ link YouTube?
 * 1. Kiểm soát dữ liệu: Chỉ cho phép các file mp3/mp4 cục bộ để đảm bảo tính ổn định của hệ thống.
 * 2. Bảo mật & Bản quyền: Tránh việc vi phạm chính sách của bên thứ 3 và các vấn đề về CORS khi phát audio.
 * 3. Tập trung vào tính năng cốt lõi: Tập trung vào xử lý AI (Whisper/LLaMA) trên các file dữ liệu chuẩn được upload.
 *
 * API này thực hiện:
 * - Tìm file âm thanh tương ứng với VideoId trong thư mục /public/uploads.
 * - Gửi file cục bộ này tới Whisper AI để tạo Transcript và Timestamps.
 */
export async function POST(req: Request) {
    try {
        await dbConnect();
        const { videoId } = await req.json();

        if (!videoId) {
            return NextResponse.json({ error: "Thiếu videoId" }, { status: 400 });
        }

        // ── BƯỚC 1: Lấy thông tin video từ DB ──
        const video = await Video.findById(videoId);
        if (!video) {
            return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
        }

        // Kiểm tra xem có phải link YouTube không (đã loại bỏ hỗ trợ)
        const isYoutube = video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be');
        if (isYoutube) {
            return NextResponse.json(
                { error: "Hệ thống đã dừng hỗ trợ link YouTube. Vui lòng sử dụng file mp3/mp4 cục bộ." },
                { status: 400 }
            );
        }

        console.log(`🔄 Re-processing local file: "${video.title}" (${videoId})`);

        // ── BƯỚC 2: Tìm file vật lý trong /public ──
        const relativePath = video.videoUrl.replace(/^\//, ""); // "/abc.mp3" → "abc.mp3"
        let filePath = path.join(process.cwd(), "public", relativePath);

        // Nếu không tìm thấy, thử tìm trực tiếp tên file trong thư mục public
        if (!fs.existsSync(filePath)) {
            const justFileName = path.basename(video.videoUrl);
            const fallbackPath = path.join(process.cwd(), "public", justFileName);
            
            if (fs.existsSync(fallbackPath)) {
                filePath = fallbackPath;
            } else {
                return NextResponse.json(
                    { error: `Không tìm thấy file vật lý tại /public. Vui lòng upload lại file.` },
                    { status: 404 }
                );
            }
        }

        // ── BƯỚC 3: Gọi Whisper AI để lấy transcript ──
        console.log(`🤖 Gửi file cục bộ tới Whisper AI...`);
        const { fullText, segments } = await transcribeVideo(filePath);

        if (!fullText || fullText.length < 10) {
            return NextResponse.json(
                { error: "AI không nhận diện được nội dung từ file âm thanh này" },
                { status: 422 }
            );
        }

        // ── BƯỚC 4: Cập nhật DB ──
        await Video.findByIdAndUpdate(videoId, {
            script: fullText,
            segments: segments,
        });

        console.log(`✅ Đã cập nhật xong dữ liệu từ file local`);

        return NextResponse.json({
            success: true,
            message: `Xử lý file cục bộ thành công!`,
            data: {
                videoId,
                title: video.title,
                segmentCount: segments.length,
            },
        });
    } catch (error: any) {
        console.error("Lỗi re-process:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
