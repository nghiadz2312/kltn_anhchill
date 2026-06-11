import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const passwordResetTokenSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    tokenHash: {
        type: String,
        required: true,
    },
    expiredAt: {
        type: Date,
        default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 giờ
        index: { expires: 0 },
    },
});

passwordResetTokenSchema.methods.compareToken = async function (candidateToken: string) {
    return bcrypt.compare(candidateToken, this.tokenHash);
};

// Mỗi email chỉ có 1 token hợp lệ tại một thời điểm
passwordResetTokenSchema.pre("save", async function (next) {
    if (this.isNew) {
        await (this.constructor as any).deleteMany({ email: this.email });
    }
    next();
});

const PasswordResetToken =
    mongoose.models.PasswordResetToken ||
    mongoose.model("PasswordResetToken", passwordResetTokenSchema);

export default PasswordResetToken;
