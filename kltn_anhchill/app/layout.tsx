import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/components/AuthContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: {
        default: "EngChill — Học tiếng Anh qua Video",
        template: "%s | EngChill", // Trang Watch sẽ hiện "Tên bài | EngChill"
    },
    description:
        "Nền tảng học tiếng Anh thông minh: xem video, đọc transcript tự động (AI Whisper), làm bài tập được sinh tự động (AI GPT). Học tiếng Anh thật chill!",
    keywords: ["học tiếng anh", "luyện nghe", "english", "AI", "whisper", "engchill"],
    authors: [{ name: "Nguyễn Giang Tuấn Nghĩa" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`}>
            <body className="min-h-screen bg-slate-950 text-white flex flex-col">
                <AuthProvider>
                    <Header />
                    <main className="flex-1">
                        {children}
                    </main>
                    <ToastContainer 
                        position="bottom-right"
                        autoClose={3000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="dark"
                    />
                </AuthProvider>
            </body>
        </html>
    );
}
