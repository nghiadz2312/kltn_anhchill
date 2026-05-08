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
        template: '%s | EngChill',
        default: 'EngChill - Học tiếng Anh thật chill',
    },
    description: "Học tiếng Anh qua audio và transcript thông minh",
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
                    <ToastContainer theme="dark" position="bottom-right" />
                </AuthProvider>
            </body>
        </html>
    );
}
