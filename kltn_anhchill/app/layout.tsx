import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/components/AuthContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const plusJakartaSans = Plus_Jakarta_Sans({ variable: "--font-plus-jakarta", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: {
        template: '%s | EngChill',
        default: 'EngChill - Học tiếng Anh thật chill',
    },
    description: "Học tiếng Anh qua audio và transcript thông minh",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
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
