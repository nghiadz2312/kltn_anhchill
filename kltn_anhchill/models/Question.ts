import mongoose from "mongoose";

// Câu hỏi AI sinh ra được lưu vào DB để cache — tránh gọi AI lại mỗi lần (tốn tiền + chậm)

const questionSchema = new mongoose.Schema(
    {
        videoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
            required: true,
            index: true, // Index để query nhanh theo videoId
        },

        type: {
            type: String,
            enum: ["multiple_choice", "fill_blank"],
            required: true,
        },

        // ── Trắc nghiệm ──
        question: { type: String, default: "" },
        options: { type: [String], default: [] },   // ["A", "B", "C", "D"]
        correctIndex: { type: Number, default: 0 }, // 0 = A, 1 = B, ...
        explanation: { type: String, default: "" }, // Giải thích đáp án

        // ── Điền từ ──
        sentence: { type: String, default: "" },        // Câu đầy đủ
        blankedSentence: { type: String, default: "" }, // Câu có ___
        answer: { type: String, default: "" },          // Đáp án đúng
        hint: { type: String, default: "" },           // Gợi ý
    },
    { timestamps: true }
);

const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);
export default Question;
