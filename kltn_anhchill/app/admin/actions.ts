'use server';

import { transcribeVideo } from "@/lib/whisper";
import { uploadAudioToCloudinary } from "@/lib/cloudinary";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill - Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562
 *
 * Tại sao dùng Server Action thay vì API Route?
 * 1. Hỗ trợ file lớn: Server Action cho phép cấu hình giới hạn dung lượng (bodySizeLimit)
 *    lên đến 50MB hoặc hơn trong next.config.ts.
 * 2. Bảo mật: Tự động hỗ trợ CSRF và chạy trực tiếp trên môi trường Server.
 * 3. Tích hợp tốt: Xử lý FormData một cách tự nhiên và đồng bộ với vòng đời của Next.js.
 *
 * THAY ĐỔI (Cloudinary Integration):
 * - Không còn lưu file vào /public/ (không hoạt động trên Vercel)
 * - Upload trực tiếp lên Cloudinary từ buffer → lấy URL cố định
 */
export async function uploadVideoAction(formData: FormData) {
    try {
        await dbConnect();

        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const level = (formData.get('level') as string) || "Intermediate";
        const description = (formData.get('description') as string) || "";

        if (!file || !title) {
            throw new Error("Thiếu file hoặc tiêu đề bài học");
        }

        // Convert file sang buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

        // Chạy song song: upload Cloudinary + transcribe Groq
        const [cloudinaryUrl, { fullText, segments }] = await Promise.all([
            uploadAudioToCloudinary(buffer, fileName),
            transcribeVideo(buffer, file.name),
        ]);

        // Lưu vào Database với Cloudinary URL
        const newVideo = await Video.create({
            title,
            description,
            videoUrl: cloudinaryUrl,
            script: fullText,
            segments,
            level,
            createdAt: new Date(),
        });

        return {
            success: true,
            data: {
                id: newVideo._id.toString(),
                title: newVideo.title,
                segmentCount: segments.length,
                audioUrl: cloudinaryUrl,
            }
        };

    } catch (error: any) {
        console.error("Lỗi Server Action:", error);
        return { success: false, error: error.message || "Lỗi xử lý file trên Server" };
    }
}
