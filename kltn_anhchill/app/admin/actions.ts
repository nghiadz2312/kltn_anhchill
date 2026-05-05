'use server';

import fs from "fs";
import path from "path";
import { transcribeVideo } from "@/lib/whisper";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Tại sao dùng Server Action thay vì API Route?
 * 1. Hỗ trợ file lớn: Server Action cho phép cấu hình giới hạn dung lượng (bodySizeLimit) 
 *    lên đến 50MB hoặc hơn trong next.config.ts, trong khi API Route thường bị giới hạn thấp hơn.
 * 2. Bảo mật: Tự động hỗ trợ CSRF và chạy trực tiếp trên môi trường Server.
 * 3. Tích hợp tốt: Xử lý FormData một cách tự nhiên và đồng bộ với vòng đời của Next.js.
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

        // Lưu file vào thư mục /public
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const publicPath = path.join(process.cwd(), "public", fileName);
        
        fs.writeFileSync(publicPath, buffer);

        // Gọi AI xử lý (Whisper)
        const { fullText, segments } = await transcribeVideo(publicPath);

        // Lưu vào Database
        const newVideo = await Video.create({
            title,
            description,
            videoUrl: `/${fileName}`,
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
            }
        };

    } catch (error: any) {
        console.error("Lỗi Server Action:", error);
        return { success: false, error: error.message || "Lỗi xử lý file trên Server" };
    }
}
