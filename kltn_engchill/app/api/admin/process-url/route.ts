import { NextResponse } from "next/server";
import { transcribeVideo } from "@/lib/whisper";
import { fetchFileFromUrl } from "@/lib/cloudinary";
import dbConnect from "@/lib/dbConnect";
import Video from "@/models/Video";
import path from "path";

// Bước 2/2 của luồng upload: nhận Cloudinary URL → fetch audio → Groq Whisper transcribe → lưu MongoDB
// Tách 2 bước vì Vercel giới hạn 10s/function — upload qua browser trực tiếp lên Cloudinary để tránh timeout
export const maxDuration = 60; // cho phép function chạy tối đa 60s (Vercel Pro)

export async function POST(req: Request) {
    try {
        await dbConnect();

        const { cloudinaryUrl, title, description, level, fileName, collectionId } = await req.json();

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
            collections: collectionId ? [collectionId] : [],
            createdAt: new Date(),
        });

        // Nếu có collectionId, cập nhật Collection model
        if (collectionId) {
            const Collection = (await import("@/models/Collection")).default;
            await Collection.findByIdAndUpdate(collectionId, {
                $addToSet: { videos: newVideo._id }
            });
        }

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
