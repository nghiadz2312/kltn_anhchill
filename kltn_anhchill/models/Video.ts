import mongoose from "mongoose";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * So với phiên bản cũ, Video model bây giờ có thêm:
 *
 * 1. segments[] — Mảng lưu từng câu kèm timestamp từ Whisper
 *    → Đây là dữ liệu cốt lõi để tính năng highlight transcript hoạt động
 *
 * 2. thumbnail — Ảnh bìa (URL), để trang chủ hiển thị preview đẹp
 *
 * 3. duration — Thời lượng audio tính bằng giây
 *
 * 4. collections[] — Video có thể thuộc nhiều bộ sưu tập (quan hệ nhiều-nhiều)
 *    → Đây là ref đến Collection model, dùng populate() để lấy chi tiết
 *
 * 5. createdAt, updatedAt — timestamps: true tự thêm
 */

const segmentSchema = new mongoose.Schema({
    id: { type: Number },
    start: { type: Number, required: true }, // giây bắt đầu
    end: { type: Number, required: true },   // giây kết thúc
    text: { type: String, required: true },  // nội dung câu
}, { _id: false }); // _id: false → không tạo _id cho từng segment (tiết kiệm)

const videoSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        videoUrl: {
            type: String,
            required: true, // đường dẫn file audio/video trong /public
        },
        thumbnail: {
            type: String,
            default: "", // URL ảnh bìa
        },
        level: {
            type: String,
            enum: ["Beginner", "Intermediate", "Advanced"],
            default: "Intermediate",
        },
        duration: {
            type: Number, // thời lượng tính bằng giây
            default: 0,
        },
        // Toàn bộ transcript (text thuần) — dùng cho tìm kiếm
        script: {
            type: String,
            default: "",
        },
        // Transcript có timestamp — dùng cho tính năng highlight
        segments: {
            type: [segmentSchema],
            default: [],
        },
        // Tham chiếu đến Collection — quan hệ nhiều-nhiều
        collections: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Collection",
            },
        ],
        // Thống kê
        viewCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true, // tự thêm createdAt và updatedAt
    }
);

// Text index để hỗ trợ tìm kiếm full-text
videoSchema.index({ title: "text", script: "text" });

const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);
export default Video;