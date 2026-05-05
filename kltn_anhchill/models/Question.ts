import mongoose from "mongoose";

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Tại sao lưu câu hỏi vào DB thay vì sinh lại mỗi lần?
 * → Lý do kinh tế và trải nghiệm:
 *   1. Gọi AI tốn tiền (mỗi lần ~$0.001) → sinh 1 lần, dùng nhiều lần
 *   2. Gọi AI mất 3-5 giây → cache vào DB → load tức thì lần sau
 *   3. Admin có thể chỉnh sửa câu hỏi sai → cần lưu persistent
 *
 * Đây là pattern "Generate Once, Cache Forever" hay còn gọi là
 * "AI-assisted content creation" — AI tạo nội dung, con người review.
 */

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
