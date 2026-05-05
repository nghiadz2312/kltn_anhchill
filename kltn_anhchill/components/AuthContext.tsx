'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

/**
 * 📚 GIẢI THÍCH CHO HỘI ĐỒNG:
 * 
 * AuthContext là gì?
 * → Context là cơ chế React cho phép chia sẻ dữ liệu (trạng thái đăng nhập)
 *   giữa các component mà không cần truyền props qua từng tầng (prop drilling).
 * 
 * Vấn đề không có Context:
 *   App → Layout → Header (cần biết user)
 *              ↓
 *            Page → Component → Button (cần biết user)
 *   → Phải truyền "user" qua 4-5 tầng component = rất rối!
 * 
 * Với Context:
 *   Bất kỳ component nào cũng gọi useAuth() là lấy được thông tin user ngay.
 */

interface User {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'admin';
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => {},
    refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Lấy thông tin user khi app khởi động hoặc khi F5 trang
    const refreshUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook tiện dùng: const { user } = useAuth();
export const useAuth = () => useContext(AuthContext);
