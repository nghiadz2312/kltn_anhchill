'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Dự án: KLTN_anhchill
 * Tác giả: Nguyễn Giang Tuấn Nghĩa - A46562 - Đại học Thăng Long
 * 
 * 1. QUẢN LÝ LỊCH SỬ HỌC TẬP:
 *    - Mỗi lần người dùng hoàn thành bài tập, một bản ghi UserProgress được tạo ra.
 *    - Trang Profile truy vấn các bản ghi này để hiển thị tiến độ.
 * 
 * 2. TÍNH NĂNG XEM LẠI (REVIEW):
 *    - Trước đây: Chỉ có thể làm lại bài mới.
 *    - Hiện tại: Thêm nút "XEM LẠI" (Review). Nút này truyền `attemptId` vào URL.
 *    - Giúp người học có thể xem lại chính xác lỗi sai của mình trong quá khứ mà không bị AI đổi câu hỏi khác.
 */

interface ProgressRecord {
    _id: string;
    videoId: { _id: string; title: string; level: string };
    score: number;
    correctCount: number;
    totalQuestions: number;
    completedAt: string;
}

export default function ProfilePage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [progress, setProgress] = useState<ProgressRecord[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        fetch('/api/user/progress')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data.progress)) setProgress(data.progress);
                setLoadingProgress(false);
            })
            .catch(() => setLoadingProgress(false));
    }, [user]);

    if (loading || !user) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">Loading profile...</div>;

    const totalDone = progress.length;
    const avgScore = totalDone > 0 ? Math.round(progress.reduce((s, p) => s + p.score, 0) / totalDone) : 0;
    const totalCorrect = progress.reduce((s, p) => s + p.correctCount, 0);
    const totalQuestions = progress.reduce((s, p) => s + p.totalQuestions, 0);
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Profile Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-violet-600 rounded-[2rem] flex items-center justify-center text-4xl font-black text-white shadow-lg">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{user.name}</h1>
                            <p className="text-slate-500 font-medium">{user.email}</p>
                            <span className="inline-block mt-3 bg-blue-500/10 text-blue-400 text-[10px] font-black px-4 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-widest">
                                {user.role === 'admin' ? 'Administrator' : 'Student Learner'}
                            </span>
                        </div>
                        <button onClick={logout} className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-400 font-bold hover:bg-red-500/10 hover:text-red-500 transition-all border border-slate-700">Đăng xuất</button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Bài đã làm', val: totalDone, icon: '📝', color: 'text-blue-400' },
                        { label: 'Điểm trung bình', val: `${avgScore}%`, icon: '⭐', color: 'text-yellow-400' },
                        { label: 'Tỉ lệ đúng', val: `${accuracy}%`, icon: '🎯', color: 'text-green-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 text-center shadow-lg">
                            <div className="text-3xl mb-2">{s.icon}</div>
                            <div className={`text-3xl font-black ${s.color}`}>{s.val}</div>
                            <div className="text-slate-500 text-[10px] font-black uppercase mt-2 tracking-widest">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Lịch sử bài tập */}
                <div className="space-y-6">
                    <h2 className="text-white font-black text-xl uppercase tracking-widest">📋 Lịch sử bài tập</h2>
                    {loadingProgress ? (
                        <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-900 rounded-3xl"></div>)}</div>
                    ) : progress.length === 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-16 text-center">
                            <p className="text-slate-500 font-bold">Bạn chưa hoàn thành bài tập nào.</p>
                            <Link href="/" className="mt-6 inline-block bg-blue-500 text-white font-black px-10 py-4 rounded-2xl">BẮT ĐẦU HỌC NGAY</Link>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {progress.map(p => (
                                <div key={p._id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 hover:border-slate-600 transition-all shadow-md group">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${p.score >= 80 ? 'bg-green-500/20 text-green-500' : p.score >= 50 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-500'}`}>
                                        {p.score}%
                                    </div>
                                    <div className="flex-1 text-center md:text-left min-w-0">
                                        <h3 className="text-white font-bold text-lg truncate group-hover:text-blue-400 transition-colors">{p.videoId?.title}</h3>
                                        <p className="text-slate-500 text-sm">
                                            Đúng {p.correctCount}/{p.totalQuestions} câu · {new Date(p.completedAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        {/* 📘 NÚT XEM LẠI (Review): Dẫn tới trang kết quả cũ */}
                                        <Link 
                                            href={`/watch/${p.videoId?._id}/exercise?attemptId=${p._id}`}
                                            className="flex-1 md:flex-none text-center bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                        >
                                            Xem lại
                                        </Link>
                                        {/* 📘 NÚT LÀM LẠI: Dẫn tới trang làm bài mới */}
                                        <Link 
                                            href={`/watch/${p.videoId?._id}/exercise`}
                                            className="flex-1 md:flex-none text-center bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-700"
                                        >
                                            Làm mới
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
