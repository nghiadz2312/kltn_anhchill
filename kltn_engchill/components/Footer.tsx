'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Footer() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <footer className="w-full bg-slate-900 border-t border-slate-700/60 py-10 mt-auto">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Thương hiệu & Bản quyền */}
                <div className="text-center md:text-left space-y-1.5">
                    <h3 className="text-lg font-black text-white flex items-center gap-1.5 justify-center md:justify-start">
                        Eng<span className="text-blue-400">Chill</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    </h3>
                    <p className="text-xs text-slate-400">
                        © 2025 - 2026 EngChill. All rights reserved.
                    </p>
                    <p className="text-xs text-slate-300 font-medium">
                        Đề tài Khóa luận tốt nghiệp của Sinh viên:{' '}
                        <span className="text-blue-400 font-semibold hover:underline cursor-pointer">
                            Nguyễn Giang Tuấn Nghĩa
                        </span>
                    </p>
                </div>

                {/* Các liên kết & Nút Donate */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-4 text-sm text-slate-300 font-medium">
                        <a
                            href="https://github.com/nghiadz2312"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors"
                        >
                            Github
                        </a>
                        <span className="text-slate-600">|</span>
                        <a
                            href="#"
                            className="hover:text-white transition-colors cursor-pointer"
                        >
                            Học tiếng Anh thật chill 🎧
                        </a>
                    </div>

                    {/* Nút Donate Cafe */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <span>Mời cốc cà phê</span>
                        <span className="animate-bounce">☕</span>
                    </button>
                </div>
            </div>

            {/* MODAL QR DONATE GLASSMORPHISM */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-sm bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-scale-up backdrop-blur-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Nút đóng */}
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        >
                            ✕
                        </button>

                        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto">
                            ☕
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Mời Bảnh Cốc Cà Phê</h3>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                                Nếu bạn thấy <strong>EngChill</strong> giúp bạn học tiếng Anh hiệu quả hơn,
                                hãy mời tác giả một cốc cafe để nạp năng lượng code tiếp nhé! 🚀
                            </p>
                        </div>

                        {/* QR Code Container */}
                        <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto relative overflow-hidden border border-slate-800">
                            <img
                                src="/donate-qr.png"
                                alt="QR Code Donate"
                                className="w-56 h-auto mx-auto rounded-lg"
                                onError={(e) => {
                                    // Fallback if image isn't copied yet
                                    e.currentTarget.src = "https://placehold.co/200x260?text=Donate+QR";
                                }}
                            />
                        </div>

                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            (MBBank) · Nguyen Giang Tuan Nghia
                        </div>
                    </div>
                </div>
            )}
        </footer>
    );
}
