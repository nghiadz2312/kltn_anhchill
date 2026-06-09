import mongoose from "mongoose";

// Lưu kết quả mỗi lần làm bài — tách khỏi User để dễ query thống kê và không làm document phình to

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
