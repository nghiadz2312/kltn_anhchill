import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * 
 * User Schema định nghĩa cấu trúc dữ liệu người dùng trong MongoDB.
 * 
 * Tại sao dùng Mongoose Schema thay vì lưu thẳng JSON?
 * → Schema đảm bảo dữ liệu luôn đúng kiểu, có validation tự động,
 *   tránh lưu dữ liệu rác vào database.
 * 
 * Tại sao có trường "role"?
 * → Hệ thống có 2 loại người dùng: học viên (student) và quản trị (admin).
 *   Role quyết định người dùng được truy cập những chức năng nào.
 *   Đây gọi là RBAC — Role-Based Access Control.
 */
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
            /**
             * select: false → Mặc định khi query User, trường password KHÔNG được trả về.
             * Tại sao? Bảo mật — tránh vô tình trả mật khẩu về cho client.
             * Chỉ lấy được khi query tường minh: User.findOne().select('+password')
             */
            select: false,
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
        /**
         * timestamps: true → Mongoose tự động thêm 2 trường:
         * - createdAt: thời điểm tạo tài khoản
         * - updatedAt: thời điểm cập nhật gần nhất
         * Ta không cần tự quản lý 2 trường này.
         */
        timestamps: true,
    }
);

/**
 * 🔐 PRE-SAVE HOOK — Mã hóa mật khẩu trước khi lưu vào DB
 * 
 * Tại sao phải mã hóa mật khẩu?
 * → Nếu hacker tấn công database, họ chỉ thấy chuỗi hash ngẫu nhiên,
 *   không thể đọc được mật khẩu gốc. Đây là yêu cầu bảo mật tối thiểu.
 * 
 * Tại sao dùng bcrypt?
 * → bcrypt có thuật toán "salt" — mỗi lần hash cho ra kết quả khác nhau
 *   dù cùng mật khẩu, chống được rainbow table attack.
 * 
 * Salt rounds = 12: càng cao càng an toàn nhưng càng chậm.
 * 12 là giá trị cân bằng được khuyến nghị năm 2024.
 */
userSchema.pre("save", async function (next) {
    // Chỉ hash lại nếu password bị thay đổi (tránh hash nhiều lần)
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

/**
 * Instance method: So sánh mật khẩu khi đăng nhập
 * 
 * Tại sao cần method riêng?
 * → Vì password trong DB là chuỗi hash, không thể so sánh trực tiếp.
 *   bcrypt.compare() sẽ hash mật khẩu nhập vào và so sánh với hash đã lưu.
 */
userSchema.methods.comparePassword = async function (candidatePassword: string) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
