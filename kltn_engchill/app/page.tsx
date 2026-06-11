'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

interface Video {
    _id: string;
    title: string;
    level: string;
    description: string;
    viewCount: number;
    createdAt: string;
}

interface LeaderboardEntry {
    _id: string;
    name: string;
    avatar: string;
    avgScore: number;
    totalAttempts: number;
    bestScore: number;
}

export const dynamic = 'force-dynamic';

export default function HomePage() {
    const { user } = useAuth();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalVideos, setTotalVideos] = useState(0);

    /**
     * 🏆 LEADERBOARD STATE
     *
     * leaderboard: danh sách top 10 học viên xếp theo điểm trung bình giảm dần.
     * Dữ liệu được tính từ MongoDB Aggregation Pipeline trong /api/leaderboard.
     *
     * Tại sao đặt ở trang chủ (public, không cần đăng nhập)?
     * → Khách chưa đăng ký cũng thấy bảng xếp hạng, tạo động lực đăng ký để được góp mặt.
     * Đây là kỹ thuật gamification — dùng sự cạnh tranh để tăng retention.
     */
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingRank, setLoadingRank] = useState(true);

    // Fetch leaderboard once on mount
    useEffect(() => {
        fetch('/api/leaderboard', { cache: 'no-store' })
            .then(r => r.json())
            .then(rankData => {
                if (Array.isArray(rankData)) setLeaderboard(rankData);
            })
            .catch(err => console.error("Lỗi fetch leaderboard:", err))
            .finally(() => setLoadingRank(false));
    }, []);

    // Fetch videos with server-side pagination, search, and level filter
    useEffect(() => {
        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const url = `/api/videos?page=${page}&limit=9&search=${encodeURIComponent(search)}&level=${filterLevel}`;
            fetch(url, { cache: 'no-store' })
                .then(r => r.json())
                .then(data => {
                    if (data && Array.isArray(data.videos)) {
                        setVideos(data.videos);
                        setTotalPages(data.totalPages || 1);
                        setTotalVideos(data.total || 0);
                    } else if (Array.isArray(data)) {
                        // Fallback
                        setVideos(data);
                        setTotalPages(1);
                        setTotalVideos(data.length);
                    }
                })
                .catch(err => console.error("Lỗi fetch videos:", err))
                .finally(() => setLoading(false));
        }, 300); // 300ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [page, search, filterLevel]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleLevelChange = (val: string) => {
        setFilterLevel(val);
        setPage(1);
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (page >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
            }
        }
        return pages;
    };

    const levelColors: Record<string, string> = {
        Beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
        Intermediate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
        <div className="min-h-screen bg-slate-950">

            {/* ─── HERO SECTION ─── */}
            <section className="relative overflow-hidden py-20 px-6">
                {/* Hiệu ứng nền */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/20 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
                        Powered by Whisper AI + Groq
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
                        Học tiếng Anh<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            thật sự hiệu quả
                        </span>
                    </h1>
                    <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
                        Nghe audio, đọc transcript tự động sync, làm bài tập được AI sinh ra —
                        tất cả trong một nơi.
                    </p>

                    {!user && (
                        <div className="flex items-center justify-center gap-4">
                            <Link
                                href="/register"
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-blue-500/30"
                            >
                                Bắt đầu miễn phí →
                            </Link>
                            <Link
                                href="/login"
                                className="text-slate-400 hover:text-white transition-colors font-medium px-6 py-4"
                            >
                                Đăng nhập
                            </Link>
                        </div>
                    )}
                    {user && (
                        <p className="text-slate-400">
                            Chào mừng trở lại, <span className="text-blue-400 font-bold">{user.name}</span>! 👋
                        </p>
                    )}
                </div>
            </section>

            {/* ─── FEATURES BANNER ─── */}
            <section className="border-y border-slate-800 bg-slate-900/50">
                <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-3 gap-6 text-center">
                    {[
                        { icon: '🎧', title: 'Nghe Audio', desc: 'File MP3/MP4 chất lượng cao' },
                        { icon: '📄', title: 'Transcript AI', desc: 'Whisper tự động transcribe' },
                        { icon: '📝', title: 'Bài tập Groq', desc: 'Quiz sinh tự động từ AI' },
                    ].map((f) => (
                        <div key={f.title} className="space-y-1">
                            <div className="text-2xl">{f.icon}</div>
                            <div className="text-white font-bold text-sm">{f.title}</div>
                            <div className="text-slate-500 text-xs">{f.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Leaderboard — top 10 theo avgScore, tính realtime từ MongoDB aggregate (không cache) */}
            <section className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            🏆 Bảng xếp hạng
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Top học viên điểm trung bình cao nhất</p>
                    </div>
                </div>

                {/* Skeleton loading — hiển thị khi đang fetch leaderboard */}
                {loadingRank ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-pulse flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-800 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                                    <div className="h-3 bg-slate-800 rounded w-1/4"></div>
                                </div>
                                <div className="w-12 h-6 bg-slate-800 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-10 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
                        <p className="text-4xl mb-3">🎯</p>
                        <p className="text-slate-500">Chưa có học viên nào làm bài. Hãy là người đầu tiên!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {leaderboard.map((entry, idx) => {
                            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                            const isTop3 = idx < 3;
                            const scoreColor = entry.avgScore >= 8 ? 'text-green-400' : entry.avgScore >= 6 ? 'text-blue-400' : 'text-amber-400';

                            return (
                                <div
                                    key={entry._id}
                                    className={`flex items-center gap-4 rounded-2xl p-4 transition-all border ${isTop3
                                            ? 'bg-gradient-to-r from-slate-900 to-slate-800/60 border-slate-700 hover:border-slate-500'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    {/* Rank number / medal */}
                                    <div className="w-8 text-center flex-shrink-0">
                                        {medal ? (
                                            <span className="text-2xl">{medal}</span>
                                        ) : (
                                            <span className="text-slate-500 font-mono font-bold text-sm">#{idx + 1}</span>
                                        )}
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 bg-gradient-to-br ${idx === 0 ? 'from-amber-400 to-orange-500' :
                                            idx === 1 ? 'from-slate-300 to-slate-500' :
                                                idx === 2 ? 'from-orange-600 to-orange-800' :
                                                    'from-blue-500 to-violet-600'
                                        }`}>
                                        {entry.name?.[0]?.toUpperCase() || '?'}
                                    </div>

                                    {/* Name + attempts */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold truncate">{entry.name}</p>
                                        <p className="text-slate-500 text-xs">{entry.totalAttempts} lượt làm bài</p>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right flex-shrink-0">
                                        <p className={`text-xl font-black ${scoreColor}`}>{entry.avgScore} điểm</p>
                                        <p className="text-slate-600 text-[10px]">điểm TB</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ─── VIDEO LIST ─── */}
            <section className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h2 className="text-2xl font-black text-white">
                        📚 Bài học ({totalVideos})
                    </h2>

                    {/* Search + Filter */}
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="🔍 Tìm bài học..."
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 w-48"
                        />
                        <select
                            value={filterLevel}
                            onChange={e => handleLevelChange(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Tất cả cấp độ</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>
                </div>

                {/* Loading skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 animate-pulse">
                                <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
                                <div className="h-6 bg-slate-800 rounded mb-2"></div>
                                <div className="h-4 bg-slate-800 rounded w-2/3 mb-6"></div>
                                <div className="h-12 bg-slate-800 rounded-2xl"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Video Grid */}
                {!loading && (
                    <>
                        {videos.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="text-5xl mb-4">🔍</div>
                                <p className="text-slate-400">Không tìm thấy bài học nào phù hợp</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {videos.map((v) => (
                                        <div
                                            key={v._id}
                                            className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30"
                                        >
                                            {/* Level badge */}
                                            <div className="flex items-center justify-between mb-4">
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${levelColors[v.level] || levelColors.Intermediate}`}>
                                                    {v.level}
                                                </span>
                                                <span className="text-slate-600 text-xs">{v.viewCount || 0} views</span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-bold text-white text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
                                                {v.title}
                                            </h3>

                                            {/* Description */}
                                            {v.description && (
                                                <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                                                    {v.description}
                                                </p>
                                            )}

                                            {/* CTA Button */}
                                            <Link
                                                href={`/watch/${v._id}`}
                                                className="block w-full text-center bg-white/5 hover:bg-blue-500 border border-white/10 hover:border-blue-500 text-slate-300 hover:text-white font-bold py-3 rounded-2xl transition-all duration-200"
                                            >
                                                Học ngay 🎧
                                            </Link>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-12">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 border border-slate-800 rounded-xl bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                                        >
                                            ← Trước
                                        </button>
                                        {getPageNumbers().map((p, idx) => (
                                            p === '...' ? (
                                                <span key={`dots-${idx}`} className="px-2 text-slate-600 font-bold">...</span>
                                            ) : (
                                                <button
                                                    key={`page-${p}`}
                                                    onClick={() => setPage(p as number)}
                                                    className={`w-10 h-10 rounded-xl font-bold transition-all text-sm ${
                                                        page === p
                                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                            : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        ))}
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="px-4 py-2 border border-slate-800 rounded-xl bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                                        >
                                            Sau →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}