'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useState } from 'react';

export default function Header() {
    const { user, loading, logout } = useAuth();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    if (pathname === '/login' || pathname === '/register') return null;

    const navLinks = [
        { href: '/', label: '📚 Bài học' },
        { href: '/collections', label: '🗂️ Bộ sưu tập' },
        ...(user?.role === 'admin' ? [{ href: '/admin', label: '⚙️ Admin' }] : []),
    ];

    return (
        <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-1.5 flex-shrink-0" onClick={() => setMenuOpen(false)}>
                    <span className="text-xl sm:text-2xl font-black text-white hover:text-blue-400 transition-colors">
                        Eng<span className="text-blue-400">Chill</span>
                    </span>
                    <span className="text-base sm:text-lg">🎧</span>
                </Link>

                {/* Nav — desktop */}
                <nav className="hidden md:flex items-center gap-1 flex-1">
                    {navLinks.map(l => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                pathname === l.href
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {l.label}
                        </Link>
                    ))}
                </nav>

                {/* Auth — desktop */}
                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                    {loading ? (
                        <div className="w-20 h-8 bg-white/5 rounded-xl animate-pulse" />
                    ) : user ? (
                        <>
                            <Link href="/profile" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 transition-all">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-white font-medium max-w-[90px] truncate">{user.name}</span>
                            </Link>
                            <button onClick={logout} className="text-xs text-slate-500 hover:text-white px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
                                Đăng xuất
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="text-sm text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                                Đăng nhập
                            </Link>
                            <Link href="/register" className="text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl transition-all">
                                Đăng ký
                            </Link>
                        </>
                    )}
                </div>

                {/* Hamburger — mobile */}
                <button
                    onClick={() => setMenuOpen(o => !o)}
                    className="md:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    aria-label="Menu"
                >
                    <div className="w-5 space-y-1.5">
                        <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                        <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
                        <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                    </div>
                </button>
            </div>

            {/* Mobile menu dropdown */}
            {menuOpen && (
                <div className="md:hidden border-t border-white/5 bg-slate-950/95 backdrop-blur-xl">
                    <div className="max-w-6xl mx-auto px-4 py-4 space-y-1">
                        {navLinks.map(l => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setMenuOpen(false)}
                                className={`block px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
                                    pathname === l.href
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {l.label}
                            </Link>
                        ))}

                        <div className="pt-2 border-t border-white/5 mt-2 space-y-1">
                            {loading ? null : user ? (
                                <>
                                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-300 hover:bg-white/5 transition-colors">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </Link>
                                    <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                                        🚪 Đăng xuất
                                    </button>
                                </>
                            ) : (
                                <div className="flex gap-2 px-1">
                                    <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-3 rounded-2xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors">
                                        Đăng nhập
                                    </Link>
                                    <Link href="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-3 rounded-2xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors">
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
