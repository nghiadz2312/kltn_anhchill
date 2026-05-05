import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Tại sao dùng Groq cho cả Whisper lẫn GPT?
 * → Groq cung cấp 2 loại API:
 *   1. Audio API (Whisper) → speech-to-text
 *   2. Chat Completion API (LLaMA 3) → sinh text, câu hỏi, bài tập
 *
 * Ưu điểm dùng chung 1 provider:
 *   - 1 API key duy nhất (đơn giản hóa cấu hình)
 *   - Groq chạy trên chip LPU (Language Processing Unit) → cực nhanh
 *   - LLaMA 3 70B là model mã nguồn mở mạnh, ngang GPT-4o trong nhiều task
 *
 * Tại sao yêu cầu output dạng JSON?
 * → "Structured output" / "JSON mode" giúp AI luôn trả về đúng format
 *   ta cần, không bị lẫn text thừa. Dễ parse, không bị lỗi runtime.
 *
 * Prompt Engineering — 3 nguyên tắc:
 *   1. System prompt: định nghĩa vai trò của AI
 *   2. User prompt: cung cấp ngữ cảnh + yêu cầu cụ thể
 *   3. Few-shot example: nếu cần, cho AI ví dụ mẫu để học theo
 */

export interface MultipleChoiceQuestion {
    type: "multiple_choice";
    question: string;      // Câu hỏi
    options: string[];     // 4 lựa chọn A, B, C, D
    correctIndex: number;  // Index của đáp án đúng (0-3)
    explanation: string;   // Giải thích tại sao đáp án đó đúng
}

export interface FillBlankQuestion {
    type: "fill_blank";
    sentence: string;      // Câu hoàn chỉnh (để hiển thị sau khi trả lời)
    blankedSentence: string; // Câu có chỗ trống → "The ___ is very important"
    answer: string;          // Từ đúng cần điền
    hint: string;            // Gợi ý (loại từ: noun/verb/adj...)
}

export type Question = MultipleChoiceQuestion | FillBlankQuestion;

export interface GeneratedExercise {
    videoTitle: string;
    questions: Question[];
}

export async function generateExercises(
    transcript: string,
    videoTitle: string,
    count: number = 5
): Promise<GeneratedExercise> {

    /**
     * PROMPT DESIGN:
     * Cho AI biết:
     * 1. Nó là ai (English teacher)
     * 2. Dữ liệu đầu vào (transcript)
     * 3. Format output mong muốn (JSON schema cụ thể)
     * 4. Số lượng câu hỏi cần tạo
     */
    const systemPrompt = `You are an expert English language teacher creating exercises for Vietnamese students.
Your task: Generate exercises from the given audio transcript.
Rules:
- Create a mix of multiple_choice and fill_blank questions
- Questions must be DIRECTLY based on the transcript content
- For fill_blank: blank out important vocabulary words (nouns, verbs, adjectives)
- For multiple_choice: test comprehension, vocabulary, or grammar
- Keep questions clear and at intermediate English level
- ALWAYS respond with valid JSON only, no extra text`;

    const userPrompt = `
Transcript from lesson "${videoTitle}":
"""
${transcript.slice(0, 3000)} 
"""

Generate exactly ${count} questions. Return this JSON format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What does the speaker mention about...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "According to the transcript, ..."
    },
    {
      "type": "fill_blank",
      "sentence": "The capital of France is Paris.",
      "blankedSentence": "The capital of France is ___.",
      "answer": "Paris",
      "hint": "proper noun / city name"
    }
  ]
}`;

    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", // LLaMA 3.3 70B — mạnh nhất của Groq
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
        ],
        temperature: 0.7,    // 0 = máy móc, 1 = sáng tạo; 0.7 cân bằng tốt
        max_tokens: 2000,    // Giới hạn độ dài response
        response_format: { type: "json_object" }, // BẮT AI trả JSON thuần
    });

    const content = response.choices[0].message.content || "{}";

    try {
        const parsed = JSON.parse(content);
        let questions = parsed.questions || [];

        /**
         * 📚 GIẢI THÍCH CHO HỘI ĐỒNG (HẬU XỬ LÝ AI):
         * 
         * Vấn đề: LLaMA/GPT thường sinh mặc định "___" cho mọi câu điền từ, 
         * không khớp với số ký tự thực tế của đáp án.
         * 
         * Giải pháp: Duyệt qua mảng câu hỏi, nếu là loại 'fill_blank', 
         * ta sẽ tính toán lại chuỗi gạch dưới dựa trên độ dài của 'answer'.
         * Ví dụ: "apple" (5 ký tự) → sẽ được đổi thành "_ _ _ _ _"
         * Điều này giúp sinh viên biết được độ dài từ cần tìm, tăng trải nghiệm người dùng.
         */
        questions = questions.map((q: any) => {
            if (q.type === 'fill_blank' && q.answer) {
                const underscores = "_ ".repeat(q.answer.length).trim();
                
                // Nếu AI đã sinh sẵn câu có gạch dưới, ta thay thế nó bằng chuỗi gạch chuẩn
                if (q.blankedSentence && (q.blankedSentence.includes("___") || q.blankedSentence.includes("..."))) {
                    q.blankedSentence = q.blankedSentence.replace(/(___+|\.\.\.+)/g, underscores);
                } else if (q.sentence) {
                    // Fallback: Nếu AI quên sinh blankedSentence, ta tự tạo từ câu gốc
                    const regex = new RegExp(q.answer, 'gi');
                    q.blankedSentence = q.sentence.replace(regex, underscores);
                }
            }
            return q;
        });

        return {
            videoTitle,
            questions: questions,
        };
    } catch (error: any) {
        console.error("Lỗi parse JSON từ AI:", error);
        return { videoTitle, questions: [] };
    }
}
