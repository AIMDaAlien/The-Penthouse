import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, register as apiRegister, getProfile } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface User {
    id: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, displayName?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const savedToken = localStorage.getItem('token');
            if (savedToken) {
                try {
                    const { data } = await getProfile();
                    setUser(data);
                    setToken(savedToken);
                    connectSocket(savedToken);
                } catch {
                    localStorage.removeItem('token');
                    setToken(null);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (username: string, password: string) => {
        const { data } = await apiLogin(username, password);
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        connectSocket(data.token);
    };

    const register = async (username: string, password: string, displayName?: string) => {
        const { data } = await apiRegister(username, password, displayName);
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        connectSocket(data.token);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        disconnectSocket();
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
