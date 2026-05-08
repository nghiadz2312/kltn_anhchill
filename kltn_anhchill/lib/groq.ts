import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Tại sao dùng Groq cho cả Whisper lẫn LLaMA?
 * → Groq cung cấp 2 loại API cực kỳ tối ưu:
 *   1. Audio API (Whisper-large-v3) → Speech-to-text với độ chính xác cao.
 *   2. Chat Completion API (LLaMA 3) → Sinh câu hỏi, bài tập với tốc độ vượt trội.
 *
 * Ưu điểm:
 *   - Sử dụng chip LPU (Language Processing Unit) giúp phản hồi gần như tức thì.
 *   - LLaMA 3 70B/8B là các model mã nguồn mở hàng đầu hiện nay.
 */

export interface MultipleChoiceQuestion {
    type: "multiple_choice";
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface FillBlankQuestion {
    type: "fill_blank";
    sentence: string;
    blankedSentence: string;
    answer: string;
    hint: string;
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
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";

    try {
        const parsed = JSON.parse(content);
        let questions = parsed.questions || [];

        // Hậu xử lý (Post-processing) để chuẩn hóa số gạch dưới theo độ dài từ
        questions = questions.map((q: any) => {
            if (q.type === 'fill_blank' && q.answer) {
                const underscores = "_ ".repeat(q.answer.length).trim();
                if (q.blankedSentence && (q.blankedSentence.includes("___") || q.blankedSentence.includes("..."))) {
                    q.blankedSentence = q.blankedSentence.replace(/(___+|\.\.\.+)/g, underscores);
                } else if (q.sentence) {
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
        console.error("Lỗi parse JSON từ Groq:", error);
        return { videoTitle, questions: [] };
    }
}
