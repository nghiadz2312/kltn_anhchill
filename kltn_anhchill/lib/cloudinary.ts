import { v2 as cloudinary } from "cloudinary";

// Cloudinary — lưu trữ file audio trên cloud vì Vercel filesystem là read-only khi deploy

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Đảm bảo luôn dùng HTTPS
});

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

export async function fetchFileFromUrl(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Không thể tải file từ URL: ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
