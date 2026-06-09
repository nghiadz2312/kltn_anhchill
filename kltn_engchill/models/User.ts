import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Tên không được để trống"],
            trim: true, // Tự động xóa khoảng trắng thừa ở đầu/cuối
        },
        email: {
            type: String,
            required: [true, "Email không được để trống"],
            unique: true, // MongoDB tự tạo unique index → không có 2 người cùng email
            lowercase: true, // Tự động chuyển thành chữ thường để tránh trùng lặp kiểu "User@gmail.com" vs "user@gmail.com"
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Mật khẩu không được để trống"],
            minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự"],
            select: false, // không trả về trong query thường, phải gọi .select('+password') tường minh
        },
        role: {
            type: String,
            enum: ["student", "admin"], // Chỉ chấp nhận 2 giá trị này
            default: "student", // Người dùng đăng ký mới luôn là student
        },
        savedVideos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video", // Tham chiếu đến collection Video
            },
        ],
        watchHistory: [
            {
                video: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
                watchedAt: { type: Date, default: Date.now },
            },
        ],
        avatar: {
            type: String,
            default: "", // URL ảnh đại diện (có thể để trống)
        },
    },
    {
        timestamps: true, // tự thêm createdAt và updatedAt
    }
);

// Pre-save hook: hash password bằng bcrypt (salt=12) trước khi lưu
// Chỉ chạy khi password thay đổi, tránh hash nhiều lần
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// So sánh mật khẩu khi đăng nhập — bcrypt.compare hash mật khẩu nhập vào rồi đối chiếu với hash trong DB
userSchema.methods.comparePassword = async function (candidatePassword: string) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
