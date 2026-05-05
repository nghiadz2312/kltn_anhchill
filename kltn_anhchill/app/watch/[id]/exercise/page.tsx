'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

/**
 * 📘 GIẢI THÍCH CHO HỘI ĐỒNG BẢO VỆ:
 * Dự án: KLTN_anhchill
 * Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562 - Đại học Thăng Long
 * 
 * 1. TÍNH NĂNG XEM LẠI (REVIEW MODE):
 *    - Khi URL có tham số `attemptId`, trang sẽ chuyển sang chế độ Review.
 *    - Thay vì gọi AI sinh câu hỏi mới, trang gọi API `/api/exercises/results` để lấy dữ liệu cũ.
 * 
 * 2. HIỂN THỊ TRẮC NGHIỆM ĐẦY ĐỦ:
 *    - Trong phần review, toàn bộ các lựa chọn (A, B, C, D) đều được hiển thị lại.
 *    - Giúp người học phân tích được tại sao mình chọn sai và phương án đúng là gì.
 * 
 * 3. ĐIỀU HƯỚNG LINH HOẠT:
 *    - Người dùng có thể chọn "Làm bài mới" (AI sinh bộ câu hỏi khác) hoặc quay lại Dashboard.
 */

interface MCQuestion {
    _id: string; type: 'multiple_choice';
    question: string; options: string[];
    correctIndex: number; explanation: string;
}
interface FBQuestion {
    _id: string; type: 'fill_blank';
    blankedSentence: string; sentence: string;
    answer: string; hint: string;
}
type Question = MCQuestion | FBQuestion;

interface GradedResult {
    questionId: string; isCorrect: boolean;
    userAnswer: string; correctAnswer: string;
    explanation: string; questionText: string;
    type: string; options?: string[];
}

type PageState = 'loading' | 'generating' | 'doing' | 'submitting' | 'submitted' | 'error';

export default function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: videoId } = use(params);
    const { user } = useAuth();

    const [pageState, setPageState] = useState<PageState>('loading');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [videoTitle, setVideoTitle] = useState('');
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [results, setResults] = useState<GradedResult[]>([]);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const attemptId = searchParams.get('attemptId');
        
        if (attemptId) {
            loadOldResults(attemptId);
        } else {
            loadQuestions(false);
        }
    }, [videoId]);

    // Tải lại bài làm cũ từ database
    const loadOldResults = async (attemptId: string) => {
        try {
            setPageState('loading');
            const res = await fetch(`/api/exercises/results?attemptId=${attemptId}`);
            const data = await res.json();
            if (res.ok) {
                setScore(data.score);
                setFeedback(data.feedback);
                setResults(data.results);
                setQuestions(data.questions);
                setVideoTitle(data.videoTitle);
                setPageState('submitted');
            } else {
                loadQuestions(false);
            }
        } catch {
            loadQuestions(false);
        }
    };

    const loadQuestions = async (forceRegenerate: boolean) => {
        try {
            setPageState(forceRegenerate ? 'generating' : 'loading');
            setAnswers({});
            setResults([]);

            if (forceRegenerate) {
                const res = await fetch('/api/exercises/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoId, count: 6, forceRegenerate: true }),
                });
                const data = await res.json();
                setQuestions(data.questions || []);
            } else {
                const getRes = await fetch(`/api/exercises/generate?videoId=${videoId}`);
                const getData = await getRes.json();
                if (getData.questions?.length > 0) {
                    setQuestions(getData.questions);
                } else {
                    setPageState('generating');
                    const genRes = await fetch('/api/exercises/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ videoId, count: 6 }),
                    });
                    const genData = await genRes.json();
                    setQuestions(genData.questions || []);
                }
            }

            const vidRes = await fetch(`/api/videos/${videoId}`);
            const vidData = await vidRes.json();
            setVideoTitle(vidData.title || 'Bài học');
            setPageState('doing');
        } catch {
            setPageState('error');
        }
    };

    const handleAnswer = (questionId: string, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        const unanswered = questions.filter(q => !answers[q._id]);
        if (unanswered.length > 0) {
            const confirmSubmit = window.confirm(`Bạn còn ${unanswered.length}/${questions.length} câu chưa trả lời. Nộp luôn chứ?`);
            if (!confirmSubmit) return;
        }

        setPageState('submitting');
        try {
            const answerList = questions.map(q => ({
                questionId: q._id,
                userAnswer: answers[q._id] || '',
            }));

            const res = await fetch('/api/exercises/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, userId: user?.id, answers: answerList }),
            });

            const data = await res.json();
            setScore(data.score);
            setFeedback(data.feedback);
            setResults(data.results || []);
            setPageState('submitted');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
            setPageState('doing');
            alert('Lỗi nộp bài!');
        }
    };

    if (pageState === 'loading' || pageState === 'generating') {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black">AI IS WORKING...</div>;
    }

    if (pageState === 'submitted') {
        return (
            <div className="min-h-screen bg-slate-950 py-10 px-4">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header Score Card */}
                    <div className={`rounded-[3rem] p-10 border shadow-2xl text-center ${score >= 80 ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Kết quả bài tập</p>
                        <div className="text-8xl font-black text-white mb-4">{score}%</div>
                        <h2 className="text-2xl font-bold text-white mb-8">{feedback}</h2>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => loadQuestions(true)} className="bg-blue-500 text-white font-black px-8 py-4 rounded-2xl shadow-lg">LÀM BÀI MỚI</button>
                            <Link href="/profile" className="bg-slate-800 text-white font-black px-8 py-4 rounded-2xl">LỊCH SỬ HỌC TẬP</Link>
                        </div>
                    </div>

                    {/* Review Details */}
                    <div className="space-y-6">
                        {results.map((result, idx) => (
                            <div key={result.questionId} className={`rounded-[2rem] p-8 border ${result.isCorrect ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black flex-shrink-0 ${result.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{idx + 1}</div>
                                    <div className="flex-1 space-y-4">
                                        <p className="text-white text-lg font-bold leading-relaxed">{result.questionText}</p>
                                        
                                        {/* TRẮC NGHIỆM: HIỂN THỊ ĐẦY ĐỦ OPTIONS */}
                                        {result.type === 'multiple_choice' && result.options && (
                                            <div className="space-y-4">
                                                {/* 📘 CẢNH BÁO BỎ TRỐNG: Nếu chưa chọn đáp án nào */}
                                                {!result.userAnswer && (
                                                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-xs font-bold animate-pulse">
                                                        ⚠️ Bạn đã bỏ trống câu hỏi này
                                                    </div>
                                                )}
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {result.options.map((opt, i) => {
                                                        const isUserSelected = String(i) === result.userAnswer;
                                                        const isCorrectAns = opt === result.correctAnswer;
                                                        
                                                        return (
                                                            <div key={i} className={`p-4 rounded-2xl border transition-all ${
                                                                isCorrectAns ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]' :
                                                                isUserSelected && !result.isCorrect ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                                                'bg-slate-900 border-slate-800 text-slate-500 opacity-60'
                                                            }`}>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-bold">{String.fromCharCode(65 + i)}. {opt}</span>
                                                                    {isCorrectAns && <span className="text-[10px] font-black uppercase bg-green-500 text-white px-2 py-0.5 rounded ml-2">ĐÚNG</span>}
                                                                    {isUserSelected && !result.isCorrect && <span className="text-[10px] font-black uppercase bg-red-500 text-white px-2 py-0.5 rounded ml-2">BẠN CHỌN SAI</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* ĐIỀN TỪ */}
                                        {result.type === 'fill_blank' && (
                                            <div className="bg-slate-800/50 p-6 rounded-2xl space-y-2">
                                                <p><span className="text-slate-500 text-xs font-black uppercase">Bạn đã điền:</span> <span className={`font-bold ml-2 ${result.isCorrect ? 'text-green-400' : 'text-red-400'}`}>{result.userAnswer || '(Trống)'}</span></p>
                                                {!result.isCorrect && <p><span className="text-slate-500 text-xs font-black uppercase">Đáp án đúng:</span> <span className="text-green-400 font-bold ml-2">{result.correctAnswer}</span></p>}
                                            </div>
                                        )}

                                        {result.explanation && (
                                            <div className="bg-blue-500/5 border-l-2 border-blue-500/30 p-4 text-slate-400 text-sm italic">
                                                💡 Giải thích: {result.explanation}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const answeredCount = Object.keys(answers).length;
    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center justify-between bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
                    <div className="flex items-center gap-4">
                        <Link href={`/watch/${videoId}`} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">←</Link>
                        <div><h1 className="text-white font-black text-lg uppercase">{videoTitle}</h1><p className="text-slate-500 text-xs">Tiến độ: {answeredCount}/{questions.length} câu</p></div>
                    </div>
                    <button onClick={handleSubmit} className="bg-blue-500 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest">Nộp bài</button>
                </div>

                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <div key={q._id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
                            <p className="text-blue-500 text-[10px] font-black uppercase mb-4">Câu hỏi {idx + 1}</p>
                            {q.type === 'multiple_choice' ? (
                                <div className="space-y-3">
                                    <p className="text-white text-lg font-bold mb-6">{q.question}</p>
                                    {q.options.map((opt, i) => (
                                        <button key={i} onClick={() => handleAnswer(q._id, String(i))} className={`w-full text-left px-6 py-4 rounded-2xl border transition-all ${answers[q._id] === String(i) ? 'bg-blue-500/20 border-blue-500 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                                            <span className="font-black mr-4 text-slate-600">{String.fromCharCode(65 + i)}.</span> {opt}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-white text-lg font-bold mb-2 leading-relaxed">{q.blankedSentence}</p>
                                    <p className="text-blue-400 text-xs font-bold uppercase">💡 Gợi ý: {q.hint}</p>
                                    <input type="text" placeholder="Gõ đáp án..." value={answers[q._id] || ''} onChange={e => handleAnswer(q._id, e.target.value)} className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white rounded-2xl px-6 py-4 focus:outline-none transition-all" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={handleSubmit} className="w-full bg-white text-black font-black py-6 rounded-[2rem] text-lg uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-200 transition-all">Hoàn thành & Xem điểm</button>
            </div>
        </div>
    );
}
