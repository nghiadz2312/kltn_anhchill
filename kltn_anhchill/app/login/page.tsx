'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

/**
 * Trang Đăng nhập
 * 
 * Luồng hoạt động:
 * 1. User điền email + password → nhấn Đăng nhập
 * 2. Client gửi POST /api/auth/login
 * 3. Server kiểm tra → trả JWT trong cookie
 * 4. Client redirect về trang chủ (hoặc trang trước đó)
 * 
 * Tại sao dùng 'use client'?
 * → useState và useRouter là React hooks, chỉ chạy được ở client-side.
 *   Server components không có state và không thể handle sự kiện click.
 */
export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Ngăn form submit theo cách truyền thống (reload trang)
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Đăng nhập thất bại');
                setError(data.error || 'Đăng nhập thất bại');
                return;
            }

            // Đăng nhập thành công
            toast.success("Chào mừng bạn quay trở lại!");
            window.location.href = '/';
        } catch (e: any) {
            toast.error("Lỗi kết nối: " + e.message);
            setError('Không thể kết nối server, thử lại sau');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">

            {/* Hiệu ứng nền */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <h1 className="text-4xl font-black text-white">
                            Eng<span className="text-blue-400">Chill</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Học tiếng Anh thật chill 🎧</p>
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-2">Đăng nhập</h2>
                    <p className="text-slate-400 mb-8 text-sm">
                        Chưa có tài khoản?{' '}
                        <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Đăng ký ngay
                        </Link>
                    </p>

                    {/* Thông báo lỗi */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email field */}
                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                                Email
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        {/* Password field */}
                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-4 py-3.5 pr-12 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-sm"
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Submit button */}
                        <button
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Đang đăng nhập...
                                </span>
                            ) : (
                                'Đăng nhập →'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
