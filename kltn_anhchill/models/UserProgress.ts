import mongoose from "mongoose";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * UserProgress lưu kết quả mỗi lần người dùng làm bài.
 *
 * Tại sao cần model riêng thay vì lưu trong User?
 * → Single Responsibility Principle:
 *   - User model: thông tin tài khoản
 *   - UserProgress model: lịch sử học tập
 *   → Tách ra dễ query thống kê, dễ xóa khi cần, không làm User document phình to
 *
 * Dữ liệu này dùng để:
 *   1. Hiển thị lịch sử làm bài của học viên
 *   2. Tính điểm trung bình theo từng video
 *   3. Gợi ý video phù hợp (feature tương lai)
 */

const userProgressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        videoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
            required: true,
            index: true,
        },
        // Từng câu trả lời
        answers: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                },
                userAnswer: { type: String }, // Câu trả lời của user
                isCorrect: { type: Boolean },
            },
        ],
        score: { type: Number, required: true },     // Điểm: 0-100
        totalQuestions: { type: Number, required: true },
        correctCount: { type: Number, required: true },
        completedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const UserProgress =
    mongoose.models.UserProgress ||
    mongoose.model("UserProgress", userProgressSchema);
export default UserProgress;
