'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const [form, setForm] = useState({ password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!token || !email) {
            toast.error('Link không hợp lệ');
            router.replace('/forgot-password');
        }
    }, [token, email, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.confirm) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        if (form.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, password: form.password }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Có lỗi xảy ra');
                return;
            }

            setDone(true);
            toast.success('Đặt lại mật khẩu thành công!');
            setTimeout(() => router.push('/login'), 2000);
        } catch {
            toast.error('Không thể kết nối server, thử lại sau');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <h1 className="text-4xl font-black text-white">
                            Eng<span className="text-blue-400">Chill</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Học tiếng Anh thật chill 🎧</p>
                    </Link>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    {done ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                ✅
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Thành công!</h2>
                            <p className="text-slate-400 text-sm mb-6">
                                Mật khẩu đã được đặt lại. Đang chuyển về trang đăng nhập...
                            </p>
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold text-sm">
                                Đăng nhập ngay →
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-2">Đặt lại mật khẩu</h2>
                            <p className="text-slate-400 mb-8 text-sm">
                                Nhập mật khẩu mới cho tài khoản{' '}
                                <strong className="text-white">{email}</strong>
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-slate-300 text-sm font-medium mb-2">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Ít nhất 6 ký tự"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            required
                                            minLength={6}
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

                                <div>
                                    <label className="block text-slate-300 text-sm font-medium mb-2">
                                        Xác nhận mật khẩu
                                    </label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Nhập lại mật khẩu"
                                        value={form.confirm}
                                        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                                        required
                                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                </div>

                                {form.confirm && form.password !== form.confirm && (
                                    <p className="text-red-400 text-sm">Mật khẩu không khớp</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Đang xử lý...
                                        </span>
                                    ) : (
                                        'Đặt lại mật khẩu →'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
