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

export const dynamic = 'force-dynamic';

export default function HomePage() {
    const { user } = useAuth();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState('');

    useEffect(() => {
        fetch('/api/videos', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setVideos(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Lọc + tìm kiếm ở client-side (đơn giản, có thể chuyển lên API sau)
    const filtered = videos.filter(v => {
        const matchSearch = v.title.toLowerCase().includes(search.toLowerCase());
        const matchLevel = filterLevel ? v.level === filterLevel : true;
        return matchSearch && matchLevel;
    });

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
                        🤖 Powered by Groq Whisper AI + GPT
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
                        { icon: '📝', title: 'Bài tập GPT', desc: 'Quiz sinh tự động từ AI' },
                    ].map((f) => (
                        <div key={f.title} className="space-y-1">
                            <div className="text-2xl">{f.icon}</div>
                            <div className="text-white font-bold text-sm">{f.title}</div>
                            <div className="text-slate-500 text-xs">{f.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── VIDEO LIST ─── */}
            <section className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h2 className="text-2xl font-black text-white">
                        📚 Bài học ({filtered.length})
                    </h2>

                    {/* Search + Filter */}
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="🔍 Tìm bài học..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 w-48"
                        />
                        <select
                            value={filterLevel}
                            onChange={e => setFilterLevel(e.target.value)}
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
                        {filtered.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="text-5xl mb-4">🔍</div>
                                <p className="text-slate-400">Không tìm thấy bài học nào phù hợp</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filtered.map((v) => (
                                    <div
                                        key={v._id}
                                        className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30"
                                    >
                                        {/* Level badge */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${levelColors[v.level] || levelColors.Intermediate}`}>
                                                {v.level}
                                            </span>
                                            <span className="text-slate-600 text-xs">{v.viewCount} views</span>
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
                        )}
                    </>
                )}
            </section>
        </div>
    );
}