import mongoose from "mongoose";

// Quan hệ nhiều-nhiều với Video: lưu mảng videoIds trong Collection (embedding references, cách làm chuẩn MongoDB)
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
