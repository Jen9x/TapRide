'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
    id: string;
    role: 'driver' | 'passenger' | 'admin';
    is_admin: boolean;
    phone_number: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    loading: boolean;
}

interface AuthContextType extends AuthState {
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

    useEffect(() => {
        try {
            const token = localStorage.getItem('rs_token');
            const userStr = localStorage.getItem('rs_user');
            if (token && userStr) {
                setState({ token, user: JSON.parse(userStr), loading: false });
            } else {
                setState(s => ({ ...s, loading: false }));
            }
        } catch {
            setState(s => ({ ...s, loading: false }));
        }
    }, []);

    const login = useCallback((token: string, user: User) => {
        localStorage.setItem('rs_token', token);
        localStorage.setItem('rs_user', JSON.stringify(user));
        setState({ token, user, loading: false });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('rs_token');
        localStorage.removeItem('rs_user');
        setState({ token: null, user: null, loading: false });
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
