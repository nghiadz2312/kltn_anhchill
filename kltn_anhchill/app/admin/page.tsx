'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { uploadVideoAction } from './actions';

interface Video {
    _id: string;
    title: string;
    level: string;
    viewCount: number;
    createdAt: string;
    segments?: any[];
}

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * Admin Dashboard gồm 2 tab:
 * 1. "Upload bài mới" - upload file audio/video → AI tự xử lý
 * 2. "Quản lý bài học" - xem/xóa danh sách video đã có
 *
 * Tại sao không dùng thư viện UI có sẵn?
 * → Tự xây dựng giúp kiểm soát hoàn toàn UX,
 *   hiểu rõ từng component khi hội đồng hỏi.
 */
export default function AdminPage() {
    const [tab, setTab] = useState<'upload' | 'manage'>('upload');

    // ── UPLOAD STATE ──
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [level, setLevel] = useState('Intermediate');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string[]>([]);
    const [uploadDone, setUploadDone] = useState(false);

    // ── MANAGE STATE ──
    const [videos, setVideos] = useState<Video[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [reprocessingId, setReprocessingId] = useState<string | null>(null);

    const addLog = (msg: string) => setUploadProgress(prev => [...prev, msg]);

    // Khi đổi sang tab quản lý → tải danh sách video
    useEffect(() => {
        if (tab === 'manage') fetchVideos();
    }, [tab]);

    const fetchVideos = async () => {
        setLoadingVideos(true);
        const res = await fetch('/api/videos');
        const data = await res.json();
        if (Array.isArray(data)) setVideos(data);
        setLoadingVideos(false);
    };

    const handleUpload = async () => {
        if (!file || !title.trim()) {
            alert('Vui lòng nhập tiêu đề và chọn file!');
            return;
        }

        setUploading(true);
        setUploadDone(false);
        setUploadProgress([]);

        addLog('📤 Đang gửi file lên server...');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('level', level);

        try {
            addLog('🤖 Groq Whisper AI đang transcribe audio...');
            addLog('⏳ Quá trình này có thể mất 10-30 giây...');

            // Gọi Server Action thay vì fetch API
            const result = await uploadVideoAction(formData);

            if (result.success) {
                addLog(`✅ Hoàn tất! AI trích xuất được ${result.data?.segmentCount || '?'} câu.`);
                addLog(`📦 Đã lưu bài "${result.data?.title}" vào database.`);
                setUploadDone(true);
                // Reset form
                setTitle('');
                setDescription('');
                setFile(null);
                setLevel('Intermediate');
            } else {
                addLog(`❌ Lỗi: ${result.error}`);
            }
        } catch (err: any) {
            addLog(`❌ Lỗi kết nối: ${err.message || 'Server overloaded'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Xóa bài "${title}"? Thao tác không thể hoàn tác!`)) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setVideos(prev => prev.filter(v => v._id !== id));
            } else {
                alert('Xóa thất bại, thử lại!');
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleGenerateExercise = async (videoId: string) => {
        if (!confirm('Sinh bài tập AI cho video này?')) return;
        try {
            const res = await fetch('/api/exercises/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, count: 6, forceRegenerate: true }),
            });
            const data = await res.json();
            if (data.error) {
                alert(`❌ Lỗi: ${data.error}\n\n💡 Video này chưa có transcript. Hãy bấm nút ⚙️ để xử lý Whisper trước.`);
            } else {
                alert(`✅ Đã sinh ${data.questions?.length || 0} câu hỏi!`);
            }
        } catch {
            alert('Lỗi sinh bài tập');
        }
    };

    /**
     * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
     * Hàm này giải quyết vấn đề: video đã có trong DB nhưng thiếu script + segments
     * (do upload thủ công, không qua bước Whisper).
     * Fix: Gọi lại Whisper cho file audio đã có → cập nhật DB → bài tập AI hoạt động.
     */
    const handleReprocess = async (videoId: string, videoTitle: string) => {
        if (!confirm(`Xử lý lại Whisper cho "${videoTitle}"?\nWhisper sẽ đọc file audio và tạo transcript + timestamp.\nMất khoảng 10-30 giây.`)) return;
        setReprocessingId(videoId);
        try {
            const res = await fetch('/api/admin/reprocess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ Hoàn tất!\n📝 ${data.data.segmentCount} câu\n📄 ${data.data.scriptLength} ký tự transcript\n\nGiờ có thể sinh bài tập AI được rồi!`);
                // Tải lại danh sách để cập nhật trạng thái segments
                fetchVideos();
            } else {
                alert(`❌ Lỗi: ${data.error}`);
            }
        } catch {
            alert('Lỗi kết nối server khi re-process');
        } finally {
            setReprocessingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-1 rounded-full mb-2">
                            ⚙️ Admin Panel
                        </div>
                        <h1 className="text-3xl font-black text-white">Quản lý EngChill</h1>
                    </div>
                    <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">
                        ← Về trang chủ
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-1.5">
                    {[
                        { key: 'upload', label: '📤 Upload bài mới' },
                        { key: 'manage', label: `📋 Quản lý bài học (${videos.length})` },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as any)}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                tab === t.key
                                    ? 'bg-blue-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ─── TAB UPLOAD ─── */}
                {tab === 'upload' && (
                    <div className="space-y-5">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h2 className="text-white font-bold text-lg mb-5">Thông tin bài học</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">Tiêu đề bài học *</label>
                                    <input
                                        type="text"
                                        placeholder="VD: Daily Conversation — At the Coffee Shop"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white placeholder-slate-600 rounded-2xl px-4 py-3.5 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">Mô tả (tuỳ chọn)</label>
                                    <textarea
                                        placeholder="Mô tả ngắn về nội dung bài học..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={2}
                                        className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white placeholder-slate-600 rounded-2xl px-4 py-3.5 focus:outline-none transition-colors resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">Cấp độ</label>
                                    <select
                                        value={level}
                                        onChange={e => setLevel(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="Beginner">🟢 Beginner</option>
                                        <option value="Intermediate">🔵 Intermediate</option>
                                        <option value="Advanced">🔴 Advanced</option>
                                    </select>
                                </div>

                                {/* File Upload */}
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">File Audio/Video *</label>
                                    <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                                        file
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
                                    }`}>
                                        <input
                                            type="file"
                                            accept="audio/mp3,audio/mpeg,video/mp4,audio/wav,audio/m4a"
                                            className="hidden"
                                            onChange={e => setFile(e.target.files?.[0] || null)}
                                        />
                                        {file ? (
                                            <>
                                                <span className="text-3xl mb-2">🎵</span>
                                                <span className="text-blue-400 font-bold">{file.name}</span>
                                                <span className="text-slate-500 text-sm mt-1">
                                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-3xl mb-2">⬆️</span>
                                                <span className="text-slate-400 font-medium">Click để chọn file</span>
                                                <span className="text-slate-600 text-sm mt-1">MP3, MP4, WAV, M4A</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={uploading || !file || !title.trim()}
                                className="w-full mt-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all hover:-translate-y-0.5"
                            >
                                {uploading ? '🤖 AI đang xử lý...' : '🚀 Bắt đầu xử lý AI'}
                            </button>
                        </div>

                        {/* Log console */}
                        {uploadProgress.length > 0 && (
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                                <h3 className="text-slate-400 text-xs font-bold uppercase mb-3">📟 Process Log</h3>
                                <div className="space-y-2 font-mono text-sm">
                                    {uploadProgress.map((log, i) => (
                                        <div key={i} className="text-green-400">{log}</div>
                                    ))}
                                    {uploading && (
                                        <div className="flex items-center gap-2 text-blue-400">
                                            <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                                            Đang chờ AI...
                                        </div>
                                    )}
                                </div>
                                {uploadDone && (
                                    <div className="mt-4 flex gap-3">
                                        <Link
                                            href="/"
                                            className="flex-1 text-center bg-blue-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-blue-600 transition-colors"
                                        >
                                            Xem bài vừa thêm →
                                        </Link>
                                        <button
                                            onClick={() => { setUploadProgress([]); setUploadDone(false); }}
                                            className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-colors"
                                        >
                                            + Upload bài mới
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── TAB MANAGE ─── */}
                {tab === 'manage' && (
                    <div className="space-y-4">
                        {loadingVideos ? (
                            <div className="text-center py-16 text-slate-400">Đang tải...</div>
                        ) : videos.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-4xl mb-4">📭</p>
                                <p className="text-slate-400">Chưa có bài học nào. Upload bài đầu tiên đi!</p>
                                <button onClick={() => setTab('upload')} className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-600 transition-colors">
                                    Upload ngay
                                </button>
                            </div>
                        ) : (
                            videos.map(v => (
                                <div key={v._id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                                v.level === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                                                v.level === 'Advanced' ? 'bg-red-500/20 text-red-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>{v.level}</span>
                                            <span className="text-slate-600 text-xs">{v.viewCount} views</span>
                                            {v.segments && v.segments.length > 0 ? (
                                                <span className="text-xs text-green-400">✓ {v.segments.length} segments</span>
                                            ) : (
                                                <span className="text-xs text-amber-400">⚠️ Chưa có transcript</span>
                                            )}
                                        </div>
                                        <p className="text-white font-bold truncate">{v.title}</p>
                                        <p className="text-slate-600 text-xs mt-0.5">
                                            {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Nút Whisper: chỉ hiện khi video chưa có segments */}
                                        {(!v.segments || v.segments.length === 0) && (
                                            <button
                                                onClick={() => handleReprocess(v._id, v.title)}
                                                disabled={reprocessingId === v._id}
                                                title="Xử lý lại Whisper để tạo transcript + timestamp"
                                                className="w-9 h-9 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                                            >
                                                {reprocessingId === v._id ? '⏳' : '⚙️'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleGenerateExercise(v._id)}
                                            title="Sinh bài tập AI"
                                            className="w-9 h-9 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-xl transition-colors flex items-center justify-center text-sm"
                                        >
                                            📝
                                        </button>
                                        <Link
                                            href={`/watch/${v._id}`}
                                            className="w-9 h-9 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-colors flex items-center justify-center text-sm"
                                        >
                                            👁️
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(v._id, v.title)}
                                            disabled={deletingId === v._id}
                                            className="w-9 h-9 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                                        >
                                            {deletingId === v._id ? '⏳' : '🗑️'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}