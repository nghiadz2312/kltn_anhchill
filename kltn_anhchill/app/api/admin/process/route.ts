import { NextResponse } from "next/server";
import { transcribeVideo } from "@/lib/whisper";
import { uploadAudioToCloudinary } from "@/lib/cloudinary";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill - Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562
 *
 * Tăng thời gian chờ lên 60 giây để Server có đủ thời gian xử lý AI (Whisper)
 * đối với các file audio dung lượng lớn.
 */
export const maxDuration = 60;

/**
 * LUỒNG XỬ LÝ MỚI (sau khi tích hợp Cloudinary):
 *
 * 1. Nhận file mp3/wav từ Admin dashboard
 * 2. Convert sang Buffer (không cần lưu vào /public/)
 * 3. Upload Buffer lên Cloudinary → nhận secure_url
 * 4. Gửi Buffer lên Groq Whisper AI → nhận transcript + segments
 * 5. Lưu vào MongoDB với videoUrl = Cloudinary URL
 *
 * TẠI SAO KHÔNG DÙNG FILESYSTEM NỮA?
 * → Vercel là serverless platform, filesystem là READ-ONLY trong production.
 * → Trước đây: lưu vào /public/ → chỉ hoạt động trên localhost.
 * → Bây giờ: Cloudinary lưu file vĩnh viễn, truy cập được từ mọi nơi.
 */
export async function POST(req: Request) {
    try {
        await dbConnect();

        const contentType = req.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json(
                { error: "Yêu cầu phải là multipart/form-data (FormData)." },
                { status: 400 }
            );
        }

        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (error: any) {
            console.error("Failed to parse FormData:", error);
            return NextResponse.json(
                { error: `Lỗi nhận dữ liệu file: ${error.message || "Dung lượng quá lớn hoặc kết nối gián đoạn."}` },
                { status: 400 }
            );
        }

        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const level = (formData.get("level") as string) || "Intermediate";
        const description = (formData.get("description") as string) || "";

        if (!file || !title) {
            return NextResponse.json(
                { error: "Thiếu file hoặc tiêu đề bài học" },
                { status: 400 }
            );
        }

        // ── BƯỚC 1: Convert file sang Buffer ──
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

        console.log(`📤 Bắt đầu upload "${file.name}" lên Cloudinary...`);

        // ── BƯỚC 2: Upload lên Cloudinary (song song với transcription) ──
        // Chạy 2 tác vụ đồng thời để tiết kiệm thời gian
        const [cloudinaryUrl, transcribeResult] = await Promise.all([
            uploadAudioToCloudinary(buffer, fileName),
            transcribeVideo(buffer, file.name),
        ]);

        console.log(`✅ Cloudinary URL: ${cloudinaryUrl}`);

        // ── BƯỚC 3: Lưu vào MongoDB ──
        const newVideo = await Video.create({
            title,
            description,
            videoUrl: cloudinaryUrl, // ← URL Cloudinary thay vì /public/
            script: transcribeResult.fullText,
            segments: transcribeResult.segments,
            level,
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: `AI đã xử lý xong! File được lưu trên Cloudinary.`,
            data: {
                id: newVideo._id,
                title: newVideo.title,
                segmentCount: transcribeResult.segments.length,
                audioUrl: cloudinaryUrl,
            },
        });

    } catch (error: any) {
        console.error("Lỗi xử lý AI:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}