'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface VideoBasic {
    _id: string; title: string; level: string; viewCount: number;
}
interface CollectionData {
    _id: string; name: string; description: string;
    color: string; videos: VideoBasic[];
}

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   badge: 'bg-blue-500' },
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  badge: 'bg-green-500' },
    purple: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', badge: 'bg-violet-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', badge: 'bg-orange-500' },
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    badge: 'bg-red-500' },
};

export default function CollectionsPage() {
    const [collections, setCollections] = useState<CollectionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedColId, setExpandedColId] = useState<string | null>(null);

    useEffect(() => {
        /**
         * 💡 FIX LỖI TRẮNG TRANG TRÊN VERCEL:
         * - Thêm ?t=${Date.now()}: Tạo URL duy nhất mỗi lần load để "phá" cache trình duyệt.
         * - Thêm cache: 'no-store': Ép Next.js không lưu kết quả vào Data Cache.
         */
        fetch(`/api/collections?t=${Date.now()}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(data => { setCollections(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedColId(expandedColId === id ? null : id);
    };

    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white">📚 Bộ sưu tập</h1>
                    <p className="text-slate-400 mt-2">Các bài học được nhóm theo chủ đề</p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 animate-pulse h-48"></div>
                        ))}
                    </div>
                ) : collections.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-5xl mb-4">📂</p>
                        <p className="text-slate-400 text-lg">Chưa có bộ sưu tập nào</p>
                        <p className="text-slate-600 text-sm mt-2">Admin có thể tạo bộ sưu tập trong trang quản lý</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                        {collections.map(col => {
                            const c = colorMap[col.color] || colorMap.blue;
                            const isExpanded = expandedColId === col._id;
                            // Hiện tất cả nếu expanded, ngược lại hiện 3 bài đầu
                            const visibleVideos = isExpanded ? col.videos : col.videos.slice(0, 3);

                            return (
                                <div
                                    key={col._id}
                                    onClick={() => !isExpanded && toggleExpand(col._id)}
                                    className={`
                                        ${c.bg} border ${c.border} rounded-3xl p-6 transition-all duration-300
                                        ${isExpanded ? 'md:col-span-2 ring-2 ring-blue-500/50' : 'hover:-translate-y-1 cursor-pointer'}
                                    `}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h2 className={`text-xl font-black ${c.text}`}>{col.name}</h2>
                                                {isExpanded && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); toggleExpand(col._id); }}
                                                        className="text-slate-500 hover:text-white text-xs bg-slate-800 px-2 py-1 rounded-lg transition-colors"
                                                    >
                                                        Thu gọn ↑
                                                    </button>
                                                )}
                                            </div>
                                            {col.description && (
                                                <p className="text-slate-400 text-sm mt-1">{col.description}</p>
                                            )}
                                        </div>
                                        <span className={`${c.badge} text-white text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap`}>
                                            {col.videos.length} bài
                                        </span>
                                    </div>

                                    {/* Danh sách video trong collection */}
                                    <div className={`grid gap-2 ${isExpanded ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                        {visibleVideos.map(v => (
                                            <Link
                                                key={v._id}
                                                href={`/watch/${v._id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/50 hover:border-slate-700 rounded-2xl px-4 py-3 transition-all group"
                                            >
                                                <span className="text-sm group-hover:scale-110 transition-transform">🎧</span>
                                                <span className="text-slate-300 text-sm truncate flex-1 font-medium group-hover:text-white transition-colors">{v.title}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                                    v.level === 'Beginner' ? 'bg-green-500/10 text-green-500' :
                                                    v.level === 'Advanced' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {v.level}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>

                                    {!isExpanded && col.videos.length > 3 && (
                                        <div className="mt-4 text-center">
                                            <button className="text-slate-500 hover:text-blue-400 text-xs font-bold transition-colors">
                                                + {col.videos.length - 3} bài nữa... Click để xem tất cả
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

