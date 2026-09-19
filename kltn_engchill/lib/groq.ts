import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq LLM — sinh câu hỏi trắc nghiệm và điền từ từ transcript
// Model openai/gpt-oss-120b, response_format json để parse an toàn

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
    count: number = 5,
    language: string = "en"
): Promise<GeneratedExercise> {

    // Map mã ngôn ngữ → tên ngôn ngữ đầy đủ để prompt rõ ràng hơn
    const languageNames: Record<string, string> = {
        en: "English", vi: "Vietnamese", ja: "Japanese", ko: "Korean",
        zh: "Chinese", fr: "French", es: "Spanish", de: "German",
        th: "Thai", pt: "Portuguese", ru: "Russian", ar: "Arabic",
        it: "Italian", nl: "Dutch", sv: "Swedish", pl: "Polish",
    };
    const langName = languageNames[language] || language;

    const systemPrompt = `You are an expert language teacher creating exercises for students learning ${langName}.
Your task: Generate exercises from the given audio transcript which is in ${langName}.
Rules:
- Create a mix of multiple_choice and fill_blank questions
- Questions must be DIRECTLY based on the transcript content
- ALL questions, options, explanations, sentences, and hints MUST be in ${langName} (the same language as the transcript)
- For fill_blank: blank out important vocabulary words (nouns, verbs, adjectives)
- For multiple_choice: test comprehension, vocabulary, or grammar
- Keep questions clear and at intermediate level
- ALWAYS respond with valid JSON only, no extra text`;

    const userPrompt = `
Transcript from lesson "${videoTitle}" (Language: ${langName}):
"""
${transcript.slice(0, 3000)} 
"""

Generate exactly ${count} questions in ${langName}. Return this JSON format:
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
        model: "openai/gpt-oss-120b",
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
