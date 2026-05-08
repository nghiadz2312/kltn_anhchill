'use client';
import { useEffect, useRef, useState, use, useCallback } from 'react';
import Link from 'next/link';

interface Segment {
    id: number;
    start: number;
    end: number;
    text: string;
}

interface Video {
    _id: string;
    title: string;
    videoUrl: string;
    script: string;
    segments: Segment[];
    level: string;
    description: string;
    viewCount: number;
}

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 *
 * Trang Watch là trung tâm của EngChill. Tính năng chính:
 *
 * 1. AUDIO-TEXT SYNCHRONIZATION (Đồng bộ audio-văn bản)
 *    → Kỹ thuật: lắng nghe sự kiện "timeupdate" của thẻ <audio>
 *      Mỗi ~250ms, audio element phát ra event này kèm currentTime (giây hiện tại).
 *      Ta duyệt mảng segments[] để tìm câu nào có start <= currentTime <= end
 *      → Đó là câu đang được đọc → highlight nó.
 *
 * 2. AUTO-SCROLL (Cuộn tự động)
 *    → Khi câu highlight thay đổi, tự động cuộn transcript để câu đó luôn hiện trên màn hình.
 *    → Dùng ref để lấy DOM element của câu hiện tại → gọi scrollIntoView()
 *
 * 3. CLICK-TO-SEEK (Nhấn câu → nhảy đến đó)
 *    → Khi người dùng click vào câu bất kỳ,
 *      audio.currentTime = segment.start → audio nhảy đến đúng thời điểm đó.
 */
export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSegment, setActiveSegment] = useState<number>(-1); // index của câu đang phát

    // Refs — tham chiếu trực tiếp đến DOM, không gây re-render
    const audioRef = useRef<HTMLAudioElement>(null);
    const transcriptRef = useRef<HTMLDivElement>(null); // container transcript
    const segmentRefs = useRef<(HTMLParagraphElement | null)[]>([]); // từng câu

    // Lấy video từ API riêng (không lấy cả list nữa)
    useEffect(() => {
        fetch(`/api/videos/${id}`)
            .then(res => res.json())
            .then(data => {
                setVideo(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    /**
     * XỬ LÝ AUDIO TIME UPDATE — Trái tim của tính năng highlight
     *
     * Hàm này chạy mỗi ~250ms khi audio đang phát.
     * useCallback để tránh tạo lại hàm mỗi lần render → tối ưu performance.
     */
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current || !video?.segments?.length) return;

        const currentTime = audioRef.current.currentTime;

        // Tìm index của segment đang được phát
        const idx = video.segments.findIndex(
            (seg) => currentTime >= seg.start && currentTime < seg.end
        );

        // Chỉ cập nhật state khi có sự thay đổi (tránh re-render thừa)
        if (idx !== -1 && idx !== activeSegment) {
            setActiveSegment(idx);

            // AUTO-SCROLL: cuộn đến câu hiện tại
            segmentRefs.current[idx]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',  // căn giữa viewport
            });
        }
    }, [video?.segments, activeSegment]);

    // Gắn và tháo event listener khi component mount/unmount
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }, [handleTimeUpdate]);

    /**
     * CLICK-TO-SEEK: Nhấn vào câu → audio nhảy đến đó
     */
    const handleSegmentClick = (segment: Segment) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = segment.start;
        audioRef.current.play(); // tự động play
    };

    // ─── LOADING STATE ───
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-400">Đang tải bài học...</p>
                </div>
            </div>
        );
    }

    // ─── NOT FOUND STATE ───
    if (!video) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-4xl mb-4">😕</p>
                    <p className="text-white font-bold text-xl mb-2">Không tìm thấy bài học</p>
                    <Link href="/" className="text-blue-400 hover:underline">Quay về trang chủ</Link>
                </div>
            </div>
        );
    }

    const hasSegments = video.segments && video.segments.length > 0;

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-8">

                {/* Back button */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    Quay lại danh sách
                </Link>

                {/* Title + Level */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            video.level === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                            video.level === 'Advanced' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                        }`}>
                            {video.level}
                        </span>
                        <span className="text-slate-500 text-sm">{video.viewCount} lượt xem</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white">{video.title}</h1>
                    {video.description && (
                        <p className="text-slate-400 mt-2">{video.description}</p>
                    )}
                </div>

                {/* ─── LAYOUT CHÍNH: Audio bên trái, Transcript bên phải ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* ─── CỘT TRÁI: Audio Player ─── */}
                    <div className="space-y-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                                🎧 Audio
                            </h2>
                            <audio
                                ref={audioRef}
                                controls
                                className="w-full"
                                style={{ colorScheme: 'dark' }}
                            >
                                <source src={video.videoUrl} />
                                Trình duyệt không hỗ trợ audio.
                            </audio>

                            {/* Hướng dẫn */}
                            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                                <p className="text-blue-300 text-sm font-medium mb-1">💡 Cách học hiệu quả</p>
                                <ul className="text-slate-400 text-xs space-y-1">
                                    <li>• Nhấn play → câu text sẽ sáng theo audio</li>
                                    <li>• Click vào câu bất kỳ → nhảy đến đó ngay</li>
                                    <li>• Luyện nghe → nhìn transcript → luyện lại</li>
                                </ul>
                            </div>
                        </div>

                        {/* Nút thực hành */}
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href={`/watch/${id}/exercise`}
                                className="block text-center bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-bold py-4 rounded-2xl transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-purple-500/25 text-sm"
                            >
                                📝 Bài tập AI
                            </Link>
                            <Link
                                href={`/watch/${id}/dictation`}
                                className="block text-center bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold py-4 rounded-2xl transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-emerald-500/25 text-sm"
                            >
                                🎙️ Luyện Dictation
                            </Link>
                        </div>
                    </div>

                    {/* ─── CỘT PHẢI: Transcript ─── */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl flex flex-col" style={{ maxHeight: '70vh' }}>
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                📄 Transcript {hasSegments ? `(${video.segments.length} câu)` : ''}
                            </h2>
                            {hasSegments && (
                                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                                    ✓ Có timestamp
                                </span>
                            )}
                        </div>

                        {/* Danh sách câu — có thể cuộn */}
                        <div ref={transcriptRef} className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
                            {hasSegments ? (
                                video.segments.map((seg, idx) => (
                                    <p
                                        key={seg.id}
                                        ref={(el) => { segmentRefs.current[idx] = el; }}
                                        onClick={() => handleSegmentClick(seg)}
                                        className={`
                                            px-4 py-3 rounded-2xl cursor-pointer text-base leading-relaxed
                                            transition-all duration-300
                                            ${idx === activeSegment
                                                /* ← HIGHLIGHT: câu đang phát */
                                                ? 'bg-blue-500/20 border border-blue-500/40 text-white font-medium scale-[1.02]'
                                                /* ← Câu đã qua: mờ hơn */
                                                : idx < activeSegment
                                                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                                    /* ← Câu chưa đến: màu bình thường */
                                                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                            }
                                        `}
                                    >
                                        {/* Timestamp nhỏ ở đầu câu */}
                                        <span className="text-xs font-mono text-slate-600 mr-2 select-none">
                                            {formatTime(seg.start)}
                                        </span>
                                        {seg.text}
                                    </p>
                                ))
                            ) : (
                                /* Fallback: hiển thị text thuần nếu không có segments */
                                <p className="text-slate-300 text-base leading-relaxed p-4">
                                    {video.script || 'Chưa có transcript.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Format số giây thành dạng MM:SS
 * Ví dụ: 65.3 → "1:05"
 */
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}