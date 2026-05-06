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
    secure: true, // Đảm bảo luôn dùng HTTPS
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
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "video", // Cloudinary dùng "video" cho cả audio
                folder: "engchill-audio",
                public_id: fileName.replace(/\.[^/.]+$/, ""),
                overwrite: true,
                format: "mp3",
            },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error("Upload thất bại"));
                } else {
                    resolve(result.secure_url);
                }
            }
        );
        uploadStream.end(buffer);
    });
}

/**
 * deleteFromCloudinary
 * Xóa một asset khỏi Cloudinary dựa trên URL.
 * 
 * @param url - URL đầy đủ của file trên Cloudinary
 */
export async function deleteFromCloudinary(url: string) {
    try {
        if (!url || !url.includes("cloudinary.com")) return;

        // Trích xuất public_id từ URL
        // Ví dụ: https://res.cloudinary.com/cloud_name/video/upload/v12345/engchill-audio/filename.mp3
        const parts = url.split("/");
        const folderIndex = parts.indexOf("engchill-audio");
        if (folderIndex === -1) return;

        const publicIdWithExt = parts.slice(folderIndex).join("/");
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // bỏ đuôi file

        console.log(`🗑️ Đang xóa asset trên Cloudinary: ${publicId}`);
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    } catch (error) {
        console.error("Lỗi khi xóa file trên Cloudinary:", error);
    }
}

/**
 * fetchFileFromUrl
 * Tải file từ một URL về Buffer (dùng cho re-process bài cũ).
 */
export async function fetchFileFromUrl(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Không thể tải file từ URL: ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
