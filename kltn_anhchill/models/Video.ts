import mongoose from "mongoose";


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