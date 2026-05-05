import { v2 as cloudinary } from "cloudinary";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill - Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562
 *
 * Cloudinary là dịch vụ lưu trữ file media trên cloud (ảnh, video, audio).
 *
 * TẠI SAO CẦN CLOUDINARY?
 * - Vercel là serverless platform → filesystem là READ-ONLY
 * - Không thể lưu file mp3/mp4 lên /public/ khi deploy
 * - Cloudinary giải quyết: nhận file → lưu trên cloud → trả về URL cố định
 * - URL từ Cloudinary có thể phát trực tiếp trên trình duyệt (CORS OK)
 */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * uploadAudioToCloudinary
 * Upload buffer audio lên Cloudinary, trả về URL công khai.
 *
 * @param buffer - Buffer của file audio
 * @param fileName - Tên file (dùng làm public_id)
 * @returns URL công khai của file trên Cloudinary
 */
export function uploadAudioToCloudinary(buffer: Buffer, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // upload_stream: upload từ buffer thay vì file path
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "video", // Cloudinary dùng "video" cho cả audio
                folder: "engchill-audio",
                public_id: fileName.replace(/\.[^/.]+$/, ""), // bỏ đuôi file
                overwrite: true,
                format: "mp3",
            },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error("Upload thất bại"));
                } else {
                    resolve(result.secure_url); // URL HTTPS cố định
                }
            }
        );
        uploadStream.end(buffer);
    });
}
