'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate client-side trước khi gửi lên server
        if (form.password !== form.confirm) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }
        if (form.password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Đăng ký thất bại');
                return;
            }

            // Đăng ký thành công → chuyển sang trang login
            router.push('/login?registered=true');
        } catch {
            setError('Không thể kết nối server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/">
                        <h1 className="text-4xl font-black text-white">
                            Eng<span className="text-blue-400">Chill</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Học tiếng Anh thật chill 🎧</p>
                    </Link>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-2">Tạo tài khoản</h2>
                    <p className="text-slate-400 mb-8 text-sm">
                        Đã có tài khoản?{' '}
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Đăng nhập
                        </Link>
                    </p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">Họ và tên</label>
                            <input
                                id="register-name"
                                type="text"
                                placeholder="Nguyễn Văn A"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
                            <input
                                id="register-email"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">Mật khẩu</label>
                            <input
                                id="register-password"
                                type="password"
                                placeholder="Ít nhất 6 ký tự"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">Xác nhận mật khẩu</label>
                            <input
                                id="register-confirm"
                                type="password"
                                placeholder="Nhập lại mật khẩu"
                                value={form.confirm}
                                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                                required
                                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition-all"
                            />
                        </div>

                        <button
                            id="register-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Đang tạo tài khoản...
                                </span>
                            ) : 'Tạo tài khoản →'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
