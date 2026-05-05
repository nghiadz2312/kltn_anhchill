'use client';
import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';

/**
 * 📘 GIẢI THÍCH CHO HỘI ĐỒNG BẢO VỆ:
 * Dự án: KLTN_anhchill
 * Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562 - Đại học Thăng Long
 * 
 * LOGIC CHẤM ĐIỂM NGHIÊM NGẶT (Strict Scoring):
 * 1. Chế độ "Binary Scoring": Một câu chỉ được coi là ĐÚNG nếu người dùng gõ chính xác 100%. 
 *    Chỉ cần sai 1 ký tự, câu đó nhận 0 điểm. Điều này mô phỏng các kỳ thi nghe chuẩn quốc tế.
 * 2. Tính điểm trên Tổng bài: Điểm cuối cùng = (Số câu đúng 100%) / (TỔNG số câu của video).
 *    Những câu người dùng chưa làm hoặc bỏ qua (Nộp bài sớm) sẽ bị tính là 0 điểm.
 * 3. Nộp bài sớm: Cho phép người dùng kết thúc bài thi bất cứ lúc nào sau khi xác nhận cảnh báo.
 */

interface Segment { id: number; start: number; end: number; text: string; }
interface Video { _id: string; title: string; videoUrl: string; segments: Segment[]; level: string; }

type Mode = 'ready' | 'playing' | 'paused_for_input' | 'checking' | 'done';
interface WordResult { word: string; status: 'correct' | 'wrong' | 'missing' | 'extra'; }
interface SentenceHistory {
    userInput: string;
    wordResults: WordResult[];
    score: number;
}

export default function DictationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);

    const [currentIdx, setCurrentIdx] = useState(0);
    const [mode, setMode] = useState<Mode>('ready');
    const [userInput, setUserInput] = useState('');
    const [wordResults, setWordResults] = useState<WordResult[]>([]);
    const [scores, setScores] = useState<number[]>([]); 
    const [replays, setReplays] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [segmentProgress, setSegmentProgress] = useState(0);
    const [history, setHistory] = useState<Record<number, SentenceHistory>>({});

    const audioRef = useRef<HTMLAudioElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const navRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch(`/api/videos/${id}`)
            .then(r => r.json())
            .then(d => { setVideo(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        const activeBtn = navRef.current?.querySelector(`[data-idx="${currentIdx}"]`);
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [currentIdx]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !video?.segments?.length) return;

        const handleTimeUpdate = () => {
            const seg = video.segments[currentIdx];
            if (!seg) return;
            const duration = seg.end - seg.start;
            const played = audio.currentTime - seg.start;
            setSegmentProgress(Math.min(100, Math.max(0, (played / duration) * 100)));

            if (audio.currentTime >= seg.end) {
                audio.pause();
                if (!history[currentIdx]) {
                    setMode('paused_for_input');
                    setTimeout(() => inputRef.current?.focus(), 100);
                } else {
                    setMode('checking');
                }
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }, [video, currentIdx, history]);

    const playCurrentSegment = (isReplay = false) => {
        const audio = audioRef.current;
        const seg = video?.segments[currentIdx];
        if (!audio || !seg) return;
        if (isReplay) setReplays(r => r + 1);
        audio.currentTime = seg.start;
        setSegmentProgress(0);
        audio.play();
        setMode('playing');
        if (!history[currentIdx]) {
            setWordResults([]);
            if (!isReplay) setUserInput('');
        }
    };

    const checkAnswer = () => {
        const seg = video?.segments[currentIdx];
        if (!seg || history[currentIdx]) return;

        if (audioRef.current) audioRef.current.pause();

        const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;:"']/g, '').trim();
        const originalWords = seg.text.trim().split(/\s+/).filter(Boolean);
        const userWords = userInput.trim().split(/\s+/).filter(Boolean);
        const results: WordResult[] = [];
        const maxLen = Math.max(originalWords.length, userWords.length);
        let correctCount = 0;

        for (let i = 0; i < maxLen; i++) {
            const orig = originalWords[i];
            const user = userWords[i];
            if (!orig) results.push({ word: user, status: 'extra' });
            else if (!user) results.push({ word: orig, status: 'missing' });
            else if (normalize(orig) === normalize(user)) {
                results.push({ word: orig, status: 'correct' });
                correctCount++;
            } else results.push({ word: user, status: 'wrong' });
        }

        const score = Math.round((correctCount / originalWords.length) * 100);
        
        setHistory(prev => ({ ...prev, [currentIdx]: { userInput, wordResults: results, score } }));
        setWordResults(results);
        setScores(prev => [...prev, score]);
        setMode('checking');
    };

    // 📘 NỘP BÀI SỚM: Kiểm tra xem đã làm hết chưa, nếu chưa thì hỏi ý kiến User.
    const submitEarly = () => {
        const total = video?.segments?.length || 0;
        const completed = Object.keys(history).length;

        if (completed < total) {
            const confirmFinish = window.confirm(`Bạn mới hoàn thành ${completed}/${total} câu. Bạn có chắc chắn muốn nộp bài sớm không? Những câu chưa làm sẽ bị tính 0 điểm.`);
            if (!confirmFinish) return;
        }
        setMode('done');
    };

    const nextSegment = () => {
        const segs = video?.segments || [];
        if (currentIdx + 1 < segs.length) jumpToSegment(currentIdx + 1);
        else submitEarly();
    };

    const prevSegment = () => {
        if (currentIdx > 0) jumpToSegment(currentIdx - 1);
    };

    const jumpToSegment = (idx: number) => {
        const audio = audioRef.current;
        if (audio) audio.pause();
        setCurrentIdx(idx);
        setSegmentProgress(0);
        if (history[idx]) {
            setUserInput(history[idx].userInput);
            setWordResults(history[idx].wordResults);
            setMode('checking');
        } else {
            setMode('ready');
            setUserInput('');
            setWordResults([]);
        }
        setReplays(0);
        setShowHint(false);
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black tracking-widest animate-pulse">ENGCHILL LOADING...</div>;
    if (!video || !video.segments?.length) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chưa có dữ liệu bài tập cho video này.</div>;

    const segs = video.segments;
    const currentSeg = segs[currentIdx];
    
    // 📘 LOGIC CHẤM ĐIỂM NGHIÊM NGẶT (Strict Scoring)
    // Chỉ đếm những câu đạt 100% độ chính xác
    const correctSentencesCount = Object.values(history).filter(h => h.score === 100).length;
    const finalGrade = Math.round((correctSentencesCount / segs.length) * 100);
    const completedCount = Object.keys(history).length;

    if (mode === 'done') return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 text-center">
            <div className="max-w-md w-full space-y-6 bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-2xl">
                <div className="text-6xl animate-bounce">🏆</div>
                <h1 className="text-3xl font-black text-white">KẾT QUẢ BÀI THI</h1>
                <div className="p-6 bg-blue-500/10 rounded-3xl border border-blue-500/20">
                    <div className="text-6xl font-black text-blue-400 mb-2">{finalGrade}%</div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Điểm dựa trên số câu đúng 100%</p>
                </div>
                <div className="text-left bg-slate-800/50 p-4 rounded-2xl text-sm space-y-2">
                    <p className="text-slate-300 flex justify-between"><span>Số câu đúng tuyệt đối:</span> <span className="text-green-400 font-bold">{correctSentencesCount}/{segs.length}</span></p>
                    <p className="text-slate-300 flex justify-between"><span>Số câu đã thực hiện:</span> <span className="text-blue-400 font-bold">{completedCount}/{segs.length}</span></p>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => window.location.reload()} className="flex-1 bg-blue-500 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-blue-600 transition-all">LÀM LẠI</button>
                    <Link href={`/watch/${id}`} className="flex-1 bg-slate-800 text-white font-black py-5 rounded-2xl flex items-center justify-center hover:bg-slate-700 transition-all">THOÁT</Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 py-6 px-4">
            <audio ref={audioRef} src={video.videoUrl} preload="auto" className="hidden" />
            
            <div className="max-w-5xl mx-auto space-y-6">

                {/* THANH CHỈ SỐ TỔNG HỢP */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-3xl px-8 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <Link href={`/watch/${id}`} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">←</Link>
                        <div>
                            <h2 className="text-white font-black text-sm uppercase tracking-widest">Dictation Mode</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase">{video.title}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-8 items-center">
                        <div className="text-center">
                            <p className="text-slate-500 text-[10px] font-black uppercase mb-0.5">Đúng Tuyệt đối</p>
                            <p className="text-green-500 font-black">{correctSentencesCount}/{segs.length}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-800"></div>
                        <button 
                            onClick={submitEarly}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Nộp bài sớm
                        </button>
                    </div>
                </div>

                {/* Nav Bar số câu */}
                <div className="bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
                    <div ref={navRef} className="flex gap-2 overflow-x-auto no-scrollbar justify-start px-2 py-1">
                        {segs.map((_, i) => (
                            <button 
                                key={i} 
                                data-idx={i} 
                                onClick={() => jumpToSegment(i)} 
                                className={`w-10 h-10 flex-shrink-0 rounded-xl text-xs font-black transition-all border ${
                                    i === currentIdx ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110 z-10' : 
                                    history[i] ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
                                    'bg-slate-800 border-slate-700 text-slate-500'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left: Player */}
                    <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-center space-y-8 shadow-xl">
                        <div className="relative inline-block mx-auto group">
                            <svg className="w-40 h-40 transform -rotate-90">
                                <circle cx="80" cy="80" r="75" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                                <circle cx="80" cy="80" r="75" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                    strokeDasharray={471} strokeDashoffset={471 - (471 * segmentProgress) / 100} 
                                    className="text-blue-500 transition-all duration-100" />
                            </svg>
                            <button 
                                onClick={() => playCurrentSegment(false)} 
                                className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-blue-500 text-white text-4xl shadow-2xl hover:scale-105 active:scale-95 transition-all group-hover:bg-blue-400"
                            >
                                {mode === 'playing' ? '🔊' : '▶️'}
                            </button>
                        </div>
                        <div>
                            <p className="text-white font-black uppercase tracking-[0.3em] text-sm">Câu hỏi {currentIdx + 1}</p>
                            <div className="flex gap-2 mt-6">
                                <button onClick={prevSegment} disabled={currentIdx === 0} className="flex-1 py-4 rounded-2xl bg-slate-800 text-white disabled:opacity-20 hover:bg-slate-700 transition-all font-black">←</button>
                                <button onClick={nextSegment} className="flex-1 py-4 rounded-2xl bg-slate-800 text-white hover:bg-slate-700 transition-all font-black">→</button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Typing Area */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-xl min-h-[300px] flex flex-col">
                            
                            <div className="relative flex-1 font-mono text-xl tracking-[0.15em] leading-loose">
                                <div className="absolute inset-0 pointer-events-none opacity-20 select-none whitespace-pre-wrap break-words">
                                    {currentSeg.text.split('').map((char, i) => char === ' ' ? ' ' : '_').join('')}
                                </div>
                                <textarea
                                    ref={inputRef as any}
                                    value={userInput}
                                    onChange={e => setUserInput(e.target.value)}
                                    disabled={mode === 'checking' || !!history[currentIdx]}
                                    placeholder={history[currentIdx] ? "" : "Nghe và gõ lại tại đây..."}
                                    className="w-full bg-transparent text-white focus:outline-none relative z-10 resize-none overflow-hidden whitespace-pre-wrap break-words min-h-[160px] p-0"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                                <button onClick={() => setShowHint(!showHint)} className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-blue-500 transition-colors">GỢI Ý (HINT)</button>
                                
                                {!history[currentIdx] && userInput.trim().length > 0 && (
                                    <button 
                                        onClick={checkAnswer} 
                                        className="bg-blue-500 text-white font-black px-12 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-400 transition-all animate-in zoom-in-95 duration-200"
                                    >
                                        KIỂM TRA (CHECK) ✓
                                    </button>
                                )}
                            </div>

                            {showHint && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl animate-in fade-in duration-300">
                                    <p className="text-blue-400 text-sm font-mono tracking-[0.2em] break-words uppercase">
                                        {currentSeg.text.split(/\s+/).map(w => w[0] + '_'.repeat(w.length - 1)).join(' ')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Analysis Section */}
                        {(mode === 'checking' || history[currentIdx]) && (
                            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Phân tích kết quả</h4>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-4xl font-black ${ (history[currentIdx]?.score || 0) === 100 ? 'text-green-500' : 'text-red-500'}`}>
                                            {(history[currentIdx]?.score || 0)}%
                                        </span>
                                        <span className="bg-slate-800 text-[10px] text-slate-400 px-3 py-1.5 rounded-full font-black border border-slate-700 uppercase tracking-tighter">
                                            {(history[currentIdx]?.score || 0) === 100 ? 'Đã gõ đúng' : 'Chưa chính xác'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(history[currentIdx]?.wordResults || wordResults).map((w, i) => (
                                        <span key={i} className={`px-4 py-2 rounded-xl font-bold text-sm border ${
                                            w.status === 'correct' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                            w.status === 'wrong'   ? 'bg-red-500/10 text-red-400 border-red-400/20 line-through' : 
                                            w.status === 'missing' ? 'bg-slate-800 text-slate-500 border-slate-700 italic' : 
                                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        }`}>
                                            {w.word}
                                        </span>
                                    ))}
                                </div>

                                <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-3xl">
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Đáp án đúng</p>
                                    <p className="text-green-500 font-bold leading-relaxed text-lg">{currentSeg.text}</p>
                                </div>

                                <button 
                                    onClick={nextSegment} 
                                    className="w-full bg-white text-black font-black py-5 rounded-3xl hover:bg-slate-200 transition-all text-sm uppercase tracking-[0.2em] shadow-xl"
                                >
                                    {currentIdx + 1 >= segs.length ? 'TỔNG KẾT BÀI HỌC' : 'CÂU TIẾP THEO'} <span>→</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
