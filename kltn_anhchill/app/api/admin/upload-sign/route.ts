import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill - Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562
 *
 * API này tạo chữ ký (signature) để browser upload trực tiếp lên Cloudinary.
 *
 * TẠI SAO CẦN SIGNED UPLOAD?
 * - Vercel Hobby: timeout 10s → không đủ để nhận file lớn + upload Cloudinary
 * - Giải pháp: browser tự upload file thẳng lên Cloudinary (bypass Vercel)
 * - Vấn đề bảo mật: không thể để api_secret lộ ra browser
 * - Giải pháp: server tạo signature (chữ ký) → browser dùng signature đó để upload
 *
 * LUỒNG MỚI:
 * 1. Browser gọi GET /api/admin/upload-sign → nhận signature
 * 2. Browser upload thẳng file lên Cloudinary với signature đó
 * 3. Cloudinary trả về URL
 * 4. Browser gọi POST /api/admin/process-url với Cloudinary URL
 * 5. Server gọi Groq AI với URL → transcribe → lưu DB
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function GET() {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = "engchill-audio";

        // Tạo chữ ký cho upload params
        // LƯU Ý: resource_type là URL path (/video/upload), KHÔNG phải signed param
        // Chỉ ký các params sẽ nằm trong FormData
        const signature = cloudinary.utils.api_sign_request(
            { timestamp, folder },
            process.env.CLOUDINARY_API_SECRET!
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
