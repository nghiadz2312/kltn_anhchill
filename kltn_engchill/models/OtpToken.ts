import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * OtpToken — lưu mã xác thực email tạm thời
 *
 * Tại sao không lưu vào User collection?
 * → Tách biệt: User chỉ chứa tài khoản đã xác thực.
 *   OTP là dữ liệu tạm, tự động bị MongoDB xóa sau khi hết hạn (TTL index).
 *
 * TTL index: MongoDB tự xóa document sau `expiredAt`
 * → Không cần cronjob dọn dẹp thủ công.
 */
const otpTokenSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    // OTP được hash bằng bcrypt trước khi lưu (bảo mật hơn lưu plaintext)
    otpHash: {
        type: String,
        required: true,
    },
    // Lưu toàn bộ data cần thiết để tạo user sau khi verify thành công
    // Password đã được hash sẵn (pre-hashed) để không hash lại 2 lần
    userData: {
        name: String,
        email: String,
        hashedPassword: String,
    },
    // Số lần thử nhập OTP sai (giới hạn tối đa 5 lần để chống brute force)
    attempts: {
        type: Number,
        default: 0,
    },
    // TTL index: MongoDB tự xóa document sau thời điểm này
    expiredAt: {
        type: Date,
        default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 phút
        index: { expires: 0 }, // expires: 0 → xóa đúng lúc expiredAt
    },
});

// So sánh OTP người dùng nhập với hash đã lưu
otpTokenSchema.methods.compareOtp = async function (candidateOtp: string) {
    return bcrypt.compare(candidateOtp, this.otpHash);
};

// Xóa token cũ cùng email trước khi tạo mới (mỗi email chỉ có 1 OTP hiệu lực)
otpTokenSchema.pre("save", async function (next) {
    if (this.isNew) {
        await (this.constructor as any).deleteMany({ email: this.email });
    }
    next();
});

const OtpToken =
    mongoose.models.OtpToken || mongoose.model("OtpToken", otpTokenSchema);
export default OtpToken;
