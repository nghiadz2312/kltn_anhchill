'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

interface Video {
    _id: string;
    title: string;
    level: string;
    viewCount: number;
    createdAt: string;
    segments?: any[];
    collections?: string[];
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
    const [tab, setTab] = useState<'upload' | 'manage' | 'collections'>('upload');

    // ── UPLOAD STATE ──
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [level, setLevel] = useState('Intermediate');
    const [selectedCol, setSelectedCol] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string[]>([]);
    const [uploadDone, setUploadDone] = useState(false);

    // ── MANAGE STATE ──
    const [videos, setVideos] = useState<Video[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [reprocessingId, setReprocessingId] = useState<string | null>(null);

    // ── EDIT TRANSCRIPT STATE ──
    const [editingVideo, setEditingVideo] = useState<any | null>(null);
    const [editSegments, setEditSegments] = useState<any[]>([]);
    const [savingTranscript, setSavingTranscript] = useState(false);

    // ── COLLECTIONS STATE ──
    const [collections, setCollections] = useState<any[]>([]);
    const [loadingCols, setLoadingCols] = useState(false);
    const [creatingCol, setCreatingCol] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColDesc, setNewColDesc] = useState('');
    const [newColColor, setNewColColor] = useState('blue');

    const addLog = (msg: string) => setUploadProgress(prev => [...prev, msg]);

    // Tải danh sách bộ sưu tập khi mount
    useEffect(() => {
        fetchCollections();
    }, []);

    // Khi đổi tab
    useEffect(() => {
        if (tab === 'manage') fetchVideos();
        if (tab === 'collections') fetchCollections();
    }, [tab]);

    const fetchCollections = async () => {
        setLoadingCols(true);
        try {
            // 💡 FIX LỖI TRÊN VERCEL: Thêm timestamp để đảm bảo Admin luôn thấy dữ liệu mới nhất vừa tạo
            const res = await fetch(`/api/collections?t=${Date.now()}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setCollections(data);
                // Nếu chưa chọn bộ sưu tập nào và có dữ liệu, chọn mặc định cái đầu tiên hoặc "Nhạc"
                if (!selectedCol && data.length > 0) {
                    const music = data.find((c: any) => c.name === 'Nhạc');
                    setSelectedCol(music ? music._id : data[0]._id);
                }
            }
        } finally {
            setLoadingCols(false);
        }
    };

    const handleCreateCollection = async () => {
        if (!newColName.trim()) return toast.warn('Vui lòng nhập tên bộ sưu tập');
        setCreatingCol(true);
        try {
            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
                body: JSON.stringify({ name: newColName, description: newColDesc, color: newColColor }),
            });
            if (res.ok) {
                toast.success(`Đã tạo bộ sưu tập "${newColName}"`);
                setNewColName('');
                setNewColDesc('');
                fetchCollections();
            }
        } finally {
            setCreatingCol(false);
        }
    };

    const handleDeleteCollection = async (id: string, name: string) => {
        if (!confirm(`Xóa bộ sưu tập "${name}"? Các video trong đó sẽ không bị xóa.`)) return;
        try {
            const res = await fetch(`/api/collections/${id}`, { 
                method: 'DELETE',
                headers: { 'x-user-role': 'admin' }
            });
            if (res.ok) {
                toast.success('Đã xóa bộ sưu tập');
                fetchCollections();
            }
            else toast.error('Lỗi khi xóa bộ sưu tập');
        } catch { toast.error('Lỗi kết nối server'); }
    };

    const fetchVideos = async () => {
        setLoadingVideos(true);
        /**
         * 💡 NOTE BẢO VỆ: Truyền thêm ?admin=true và timestamp để API trả về dữ liệu mới nhất,
         * giúp hiển thị chính xác trạng thái transcript.
         */
        const res = await fetch(`/api/videos?admin=true&t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data)) setVideos(data);
        setLoadingVideos(false);
    };

    const handleUpload = async () => {
        if (!file || !title.trim()) {
            toast.warn('Vui lòng nhập tiêu đề và chọn file!');
            return;
        }

        setUploading(true);
        setUploadDone(false);
        setUploadProgress([]);

        try {
            // ── BƯỚC 1: Lấy chữ ký upload từ server ──
            addLog('🔐 Đang lấy quyền upload từ server...');
            const signRes = await fetch('/api/admin/upload-sign');
            if (!signRes.ok) throw new Error('Không lấy được chữ ký upload');
            const { signature, timestamp, cloudName, apiKey, folder } = await signRes.json();

            // ── BƯỚC 2: Upload file thẳng lên Cloudinary từ browser ──
            // (Bypass Vercel hoàn toàn — không bị timeout)
            addLog(`📤 Đang upload "${file.name}" lên Cloudinary...`);
            addLog('⏳ Bước này có thể mất 10-30 giây tuỳ file...');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            formData.append('api_key', apiKey);
            formData.append('folder', folder);
            // resource_type KHÔNG append vào FormData — nó đã nằm trong URL path (/video/upload)
            // Thêm vào FormData sẽ gây lỗi Invalid Signature


            const cloudRes = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
                { method: 'POST', body: formData }
            );

            if (!cloudRes.ok) {
                const err = await cloudRes.json();
                throw new Error(`Cloudinary: ${err.error?.message || 'Upload thất bại'}`);
            }

            const cloudData = await cloudRes.json();
            const cloudinaryUrl = cloudData.secure_url;
            addLog(`☁️ Upload Cloudinary thành công!`);

            // ── BƯỚC 3: Gửi URL lên server để AI transcribe ──
            addLog('🤖 Groq Whisper AI đang transcribe audio...');
            addLog('⏳ Bước này mất 10-20 giây...');

            const processRes = await fetch('/api/admin/process-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cloudinaryUrl,
                    title,
                    description,
                    level,
                    fileName: file.name,
                    collectionId: selectedCol,
                }),
            });

            const result = await processRes.json();

            if (result.success) {
                addLog(`✅ Hoàn tất! AI trích xuất được ${result.data?.segmentCount || '?'} câu.`);
                addLog(`📦 Đã lưu bài "${result.data?.title}" vào database.`);
                setUploadDone(true);
                setTitle('');
                setDescription('');
                setFile(null);
                setLevel('Intermediate');
            } else {
                addLog(`❌ Lỗi AI: ${result.error}`);
            }
        } catch (err: any) {
            addLog(`❌ Lỗi: ${err.message || 'Lỗi không xác định'}`);
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
                toast.success(`Đã xóa bài "${title}"`);
                setVideos(prev => prev.filter(v => v._id !== id));
            } else {
                toast.error('Xóa thất bại, vui lòng thử lại!');
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
                toast.error(`Lỗi: ${data.error}`);
            } else {
                toast.success(`✅ Đã sinh ${data.questions?.length || 0} câu hỏi AI!`);
            }
        } catch {
            toast.error('Lỗi hệ thống khi sinh bài tập');
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
                toast.success(`Hoàn tất xử lý Whisper! (${data.data.segmentCount} câu)`);
                fetchVideos();
            } else {
                toast.error(`Lỗi AI: ${data.error}`);
            }
        } catch {
            toast.error('Lỗi kết nối server khi re-process');
        } finally {
            setReprocessingId(null);
        }
    };

    const handleUpdateCollection = async (videoId: string, collectionId: string) => {
        try {
            const res = await fetch(`/api/admin/videos/${videoId}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
                body: JSON.stringify({ collectionId }),
            });
            if (res.ok) {
                toast.success('Đã cập nhật bộ sưu tập');
                setVideos(prev => prev.map(v => 
                    v._id === videoId ? { ...v, collections: [collectionId] } : v
                ));
            } else {
                toast.error('Lỗi khi cập nhật bộ sưu tập');
            }
        } catch {
            toast.error('Lỗi kết nối server');
        }
    };

    const handleSaveTranscript = async () => {
        if (!editingVideo) return;
        setSavingTranscript(true);
        try {
            const res = await fetch(`/api/admin/videos/${editingVideo._id}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
                body: JSON.stringify({ segments: editSegments }),
            });
            if (res.ok) {
                toast.success('Đã lưu transcript mới!');
                setEditingVideo(null);
                fetchVideos();
            } else {
                toast.error('Lưu transcript thất bại');
            }
        } catch {
            toast.error('Lỗi kết nối server');
        } finally {
            setSavingTranscript(false);
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
                <div className="flex gap-2 mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 overflow-x-auto">
                    {[
                        { key: 'upload', label: '📤 Upload bài mới' },
                        { key: 'manage', label: `📋 Bài học (${videos.length})` },
                        { key: 'collections', label: '📚 Bộ sưu tập' },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as any)}
                            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
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

                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">Bộ sưu tập</label>
                                    <select
                                        value={selectedCol}
                                        onChange={e => setSelectedCol(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500"
                                    >
                                        {collections.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                        {collections.length === 0 && <option value="">(Chưa có bộ sưu tập)</option>}
                                    </select>
                                    <p className="text-slate-500 text-[10px] mt-1 ml-1">💡 Bạn có thể tạo thêm trong tab "Bộ sưu tập"</p>
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
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-slate-500 text-[10px] uppercase font-bold">Chủ đề:</span>
                                            <select
                                                value={v.collections?.[0] || ''}
                                                onChange={(e) => handleUpdateCollection(v._id, e.target.value)}
                                                className="bg-slate-800 border border-slate-700 text-blue-400 text-[10px] font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">-- Chưa chọn --</option>
                                                {collections.map(c => (
                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
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
                                            onClick={() => {
                                                setEditingVideo(v);
                                                setEditSegments([...(v.segments || [])]);
                                            }}
                                            title="Sửa lời (Transcript)"
                                            className="w-9 h-9 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-colors flex items-center justify-center text-sm"
                                        >
                                            ✎
                                        </button>
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

                {/* ─── TAB COLLECTIONS ─── */}
                {tab === 'collections' && (
                    <div className="space-y-6">
                        {/* Form tạo mới */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                <span>✨</span> Tạo bộ sưu tập mới
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-slate-500 text-xs ml-1">Tên bộ sưu tập *</label>
                                    <input
                                        type="text"
                                        placeholder="VD: Nhạc, Phim, Toeic..."
                                        value={newColName}
                                        onChange={e => setNewColName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-slate-500 text-xs ml-1">Màu sắc hiển thị</label>
                                    <select
                                        value={newColColor}
                                        onChange={e => setNewColColor(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="blue">🔵 Màu xanh dương</option>
                                        <option value="green">🟢 Màu xanh lá</option>
                                        <option value="purple">🟣 Màu tím</option>
                                        <option value="orange">🟠 Màu cam</option>
                                        <option value="red">🔴 Màu đỏ</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-slate-500 text-xs ml-1">Mô tả (tuỳ chọn)</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập mô tả ngắn gọn về chủ đề này..."
                                        value={newColDesc}
                                        onChange={e => setNewColDesc(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCreateCollection}
                                disabled={creatingCol || !newColName.trim()}
                                className="w-full mt-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                {creatingCol ? '⏳ Đang xử lý...' : '➕ Thêm bộ sưu tập mới'}
                            </button>
                        </div>

                        {/* Danh sách hiện có */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {loadingCols ? (
                                <div className="col-span-full text-center py-10">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-slate-500 text-sm">Đang tải danh sách...</p>
                                </div>
                            ) : collections.length === 0 ? (
                                <div className="col-span-full text-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                                    <p className="text-4xl mb-4">📂</p>
                                    <p className="text-slate-500 italic">Chưa có bộ sưu tập nào. Hãy tạo cái đầu tiên!</p>
                                </div>
                            ) : (
                                collections.map(c => (
                                    <div key={c._id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-3 h-12 rounded-full shadow-lg ${
                                                c.color === 'blue' ? 'bg-blue-500 shadow-blue-500/20' :
                                                c.color === 'green' ? 'bg-green-500 shadow-green-500/20' :
                                                c.color === 'purple' ? 'bg-violet-500 shadow-violet-500/20' :
                                                c.color === 'orange' ? 'bg-orange-500 shadow-orange-500/20' :
                                                'bg-red-500 shadow-red-500/20'
                                            }`}></div>
                                            <div>
                                                <h3 className="text-white font-bold group-hover:text-blue-400 transition-colors">{c.name}</h3>
                                                <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mt-0.5">
                                                    {c.videos?.length || 0} bài học
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCollection(c._id, c.name)}
                                            className="w-10 h-10 bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                            title="Xóa bộ sưu tập"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── MODAL SỬA TRANSCRIPT ─── */}
            {editingVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-white font-bold text-xl">✎ Sửa Transcript</h2>
                                <p className="text-slate-500 text-sm truncate max-w-[400px]">{editingVideo.title}</p>
                            </div>
                            <button 
                                onClick={() => setEditingVideo(null)}
                                className="text-slate-400 hover:text-white w-8 h-8 rounded-full hover:bg-slate-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {editSegments.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 italic">Video này chưa có transcript để sửa.</div>
                            ) : (
                                editSegments.map((seg, idx) => (
                                    <div key={idx} className="flex gap-4 items-start group">
                                        <div className="text-slate-600 font-mono text-[10px] pt-3 w-12 text-right">
                                            {Math.floor(seg.start / 60)}:{(seg.start % 60).toFixed(0).padStart(2, '0')}
                                        </div>
                                        <textarea
                                            value={seg.text}
                                            onChange={(e) => {
                                                const newSegs = [...editSegments];
                                                newSegs[idx].text = e.target.value;
                                                setEditSegments(newSegs);
                                            }}
                                            rows={1}
                                            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
                                        />
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setEditingVideo(null)}
                                className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-2xl hover:bg-slate-700 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveTranscript}
                                disabled={savingTranscript || editSegments.length === 0}
                                className="flex-[2] bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                {savingTranscript ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}