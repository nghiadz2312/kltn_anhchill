import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { transcribeVideo } from "@/lib/whisper";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";

// 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
// Tăng thời gian chờ lên 60 giây để Server có đủ thời gian tải lên và xử lý AI (Whisper)
// đối với các file video/audio dung lượng lớn (trên 10MB).
export const maxDuration = 60; 

export async function POST(req: Request) {
    try {
        await dbConnect();

        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json(
                { error: 'Yêu cầu phải là multipart/form-data (FormData).' },
                { status: 400 }
            );
        }

        let formData: FormData;
        try {
            // Đây là nơi xử lý việc nhận file từ Client
            formData = await req.formData();
        } catch (error: any) {
            console.error('Failed to parse FormData:', error);
            return NextResponse.json(
                {
                    error: `Lỗi nhận dữ liệu file: ${error.message || 'Dung lượng quá lớn hoặc kết nối gián đoạn.'}`,
                },
                { status: 400 }
            );
        }

        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const level = (formData.get('level') as string) || "Intermediate";
        const description = (formData.get('description') as string) || "";

        if (!file || !title) {
            return NextResponse.json({ error: "Thiếu file hoặc tiêu đề bài học" }, { status: 400 });
        }

        // 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
        // Lưu file vào thư mục /public để có thể truy cập trực tiếp từ trình duyệt thông qua URL.
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const publicPath = path.join(process.cwd(), "public", fileName);
        
        fs.writeFileSync(publicPath, buffer);

        // ── BƯỚC XỬ LÝ AI ──
        const { fullText, segments } = await transcribeVideo(publicPath);

        const newVideo = await Video.create({
            title,
            description,
            videoUrl: `/${fileName}`,
            script: fullText,
            segments,
            level,
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: `AI đã xử lý xong!`,
            data: { id: newVideo._id, title: newVideo.title, segmentCount: segments.length },
        });

    } catch (error: any) {
        console.error("Lỗi xử lý AI:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}