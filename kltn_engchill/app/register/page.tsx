'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();

    // ── Bước 1: form đăng ký ──
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ── Bước 2: nhập OTP ──
    const [step, setStep] = useState<1 | 2>(1);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const [otpError, setOtpError] = useState('');

    // Đếm ngược để gửi lại OTP
    const [countdown, setCountdown] = useState(60);
    const [resending, setResending] = useState(false);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Bắt đầu đếm ngược khi vào bước 2
    useEffect(() => {
        if (step === 2) {
            setCountdown(60);
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current!);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            // Focus ô đầu tiên
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
        return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }, [step]);

    // ── Xử lý Bước 1: gửi form đăng ký ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

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
                body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Đăng ký thất bại');
                return;
            }
            // Chuyển sang bước 2
            setStep(2);
        } catch {
            setError('Không thể kết nối server');
        } finally {
            setLoading(false);
        }
    };

    // ── Xử lý input OTP (6 ô riêng biệt) ──
    const handleOtpChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);
        setOtpError('');
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (otp[index]) {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            } else if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
        if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
    };

    // Hỗ trợ paste toàn bộ 6 số
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            setOtpError('');
            inputRefs.current[5]?.focus();
        }
    };

    // ── Xử lý Bước 2: xác thực OTP ──
    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setOtpError('Vui lòng nhập đủ 6 chữ số');
            return;
        }
        setVerifying(true);
        setOtpError('');
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, otp: otpString }),
            });
            const data = await res.json();
            if (!res.ok) {
                setOtpError(data.error || 'Xác thực thất bại');
                return;
            }
            router.push('/login?registered=true');
        } catch {
            setOtpError('Không thể kết nối server');
        } finally {
            setVerifying(false);
        }
    };

    // ── Gửi lại OTP ──
    const handleResend = async () => {
        if (countdown > 0) return;
        setResending(true);
        setOtpError('');
        try {
            const res = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, name: form.name }),
            });
            const data = await res.json();
            if (res.ok) {
                setOtp(['', '', '', '', '', '']);
                setCountdown(60);
                countdownRef.current = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
                        return prev - 1;
                    });
                }, 1000);
                inputRefs.current[0]?.focus();
            } else {
                setOtpError(data.error || 'Gửi lại thất bại');
            }
        } catch {
            setOtpError('Không thể kết nối server');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <h1 className="text-4xl font-black text-white">
                            Eng<span className="text-blue-400">Chill</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Học tiếng Anh thật chill 🎧</p>
                    </Link>
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    {[1, 2].map(s => (
                        <div key={s} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                                step === s
                                    ? 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/40'
                                    : step > s
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-800 text-slate-500'
                            }`}>
                                {step > s ? '✓' : s}
                            </div>
                            {s === 1 && (
                                <div className={`h-0.5 w-16 transition-all duration-500 ${step > 1 ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

                    {/* ── BƯỚC 1: Form đăng ký ── */}
                    {step === 1 && (
                        <>
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
                                            Đang gửi mã xác thực...
                                        </span>
                                    ) : 'Tiếp theo →'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── BƯỚC 2: Nhập OTP ── */}
                    {step === 2 && (
                        <div className="text-center">
                            {/* Icon */}
                            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">
                                ✉️
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">Kiểm tra email</h2>
                            <p className="text-slate-400 text-sm mb-1">
                                Mã xác thực đã được gửi đến
                            </p>
                            <p className="text-blue-400 font-semibold text-sm mb-8">{form.email}</p>

                            {/* OTP Inputs */}
                            <div className="flex gap-3 justify-center mb-6">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => { inputRefs.current[i] = el; }}
                                        id={`otp-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        onPaste={i === 0 ? handleOtpPaste : undefined}
                                        className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 transition-all duration-200 outline-none bg-white/5 text-white ${
                                            digit
                                                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                                                : 'border-white/10 focus:border-blue-500 focus:bg-white/10'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Error */}
                            {otpError && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-3 mb-5 text-sm">
                                    ⚠️ {otpError}
                                </div>
                            )}

                            {/* Nút xác thực */}
                            <button
                                id="otp-verify-btn"
                                onClick={handleVerify}
                                disabled={verifying || otp.join('').length !== 6}
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 mb-4"
                            >
                                {verifying ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Đang xác thực...
                                    </span>
                                ) : 'Xác thực →'}
                            </button>

                            {/* Gửi lại */}
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <span className="text-slate-500">Không nhận được mã?</span>
                                {countdown > 0 ? (
                                    <span className="text-slate-400">Gửi lại sau <span className="text-blue-400 font-bold tabular-nums">{countdown}s</span></span>
                                ) : (
                                    <button
                                        onClick={handleResend}
                                        disabled={resending}
                                        className="text-blue-400 hover:text-blue-300 font-semibold transition-colors disabled:opacity-50"
                                    >
                                        {resending ? 'Đang gửi...' : 'Gửi lại'}
                                    </button>
                                )}
                            </div>

                            {/* Quay lại bước 1 */}
                            <button
                                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setOtpError(''); }}
                                className="mt-4 text-slate-500 hover:text-slate-400 text-sm transition-colors"
                            >
                                ← Thay đổi email
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
