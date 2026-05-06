import { NextResponse } from "next/server";
import { transcribeVideo } from "@/lib/whisper";
import { fetchFileFromUrl } from "@/lib/cloudinary";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";
import path from "path";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill - Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562
 *
 * API này xử lý BƯỚC 2 của luồng upload mới:
 * - Nhận Cloudinary URL (đã được browser upload trực tiếp lên Cloudinary)
 * - Fetch file audio từ Cloudinary URL về buffer
 * - Gửi buffer lên Groq Whisper AI để transcribe
 * - Lưu kết quả vào MongoDB
 *
 * TẠI SAO TÁCH THÀNH 2 BƯỚC?
 * - Vercel Hobby giới hạn 10 giây/function
 * - Upload file 10MB: 5-15 giây → chiếm gần hết quota
 * - Groq transcribe: 5-20 giây → cộng lại = timeout!
 * - Giải pháp: browser tự upload lên Cloudinary (bước 1, không qua Vercel)
 *   rồi server chỉ cần transcribe (bước 2, nhanh hơn vì fetch từ CDN URL)
 */
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { cloudinaryUrl, title, description, level, fileName } = await req.json();

        if (!cloudinaryUrl || !title) {
            return NextResponse.json(
                { error: "Thiếu cloudinaryUrl hoặc title" },
                { status: 400 }
            );
        }

        console.log(`🔗 Nhận Cloudinary URL: ${cloudinaryUrl}`);
        console.log(`📥 Đang tải audio từ Cloudinary để transcribe...`);

        // Fetch file từ Cloudinary về buffer
        const buffer = await fetchFileFromUrl(cloudinaryUrl);
        const audioFileName = fileName || path.basename(cloudinaryUrl);

        console.log(`🤖 Gửi audio lên Groq Whisper AI...`);

        // Transcribe với Groq AI
        const { fullText, segments } = await transcribeVideo(buffer, audioFileName);

        console.log(`✅ Transcribe xong! ${segments.length} segments`);

        // Lưu vào MongoDB
        const newVideo = await Video.create({
            title,
            description: description || "",
            videoUrl: cloudinaryUrl,
            script: fullText,
            segments,
            level: level || "Intermediate",
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: `Xử lý xong! AI trích xuất được ${segments.length} câu.`,
            data: {
                id: newVideo._id,
                title: newVideo.title,
                segmentCount: segments.length,
                audioUrl: cloudinaryUrl,
            },
        });

    } catch (error: any) {
        console.error("Lỗi process-url:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
