'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Có lỗi xảy ra');
                return;
            }

            setSent(true);
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
                    {sent ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                ✅
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Kiểm tra email!</h2>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                Nếu email <strong className="text-white">{email}</strong> tồn tại trong hệ thống,
                                bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.
                                Hãy kiểm tra cả thư mục Spam.
                            </p>
                            <Link
                                href="/login"
                                className="inline-block text-blue-400 hover:text-blue-300 font-semibold transition-colors text-sm"
                            >
                                ← Quay lại đăng nhập
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-2">Quên mật khẩu?</h2>
                            <p className="text-slate-400 mb-8 text-sm">
                                Nhập email đăng ký của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-slate-300 text-sm font-medium mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Đang gửi...
                                        </span>
                                    ) : (
                                        'Gửi link đặt lại mật khẩu →'
                                    )}
                                </button>

                                <p className="text-center text-slate-500 text-sm">
                                    Nhớ mật khẩu rồi?{' '}
                                    <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                        Đăng nhập
                                    </Link>
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
