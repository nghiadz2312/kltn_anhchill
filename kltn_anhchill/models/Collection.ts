import mongoose from "mongoose";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Collection (Bộ sưu tập) là nhóm các video cùng chủ đề.
 * Ví dụ: "Hội thoại hàng ngày", "Business English", "IELTS Speaking"
 *
 * Quan hệ nhiều-nhiều (Many-to-Many):
 * - 1 Collection có nhiều Video
 * - 1 Video có thể thuộc nhiều Collection
 *
 * Cách implement trong MongoDB:
 * → Lưu mảng videoIds trong Collection (embedding references)
 * → Đây là cách phổ biến hơn bảng trung gian của SQL,
 *   phù hợp với đặc trưng document-based của MongoDB.
 */
const collectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Tên bộ sưu tập không được để trống"],
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        thumbnail: {
            type: String,
            default: "",
        },
        // Màu chủ đạo (để hiển thị card đa dạng)
        color: {
            type: String,
            default: "blue", // blue | green | purple | orange | red
        },
        // Mảng video thuộc bộ sưu tập này
        videos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        // Thứ tự hiển thị (số nhỏ hơn = hiện trước)
        order: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const Collection =
    mongoose.models.Collection ||
    mongoose.model("Collection", collectionSchema);
export default Collection;
