import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { storage } from '../services/storage';
import { DeviceEventEmitter } from 'react-native';
import api, { login as apiLogin, register as apiRegister, getProfile } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export interface User {
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
    register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => void;
    updateProfile: (displayName?: string, avatarUrl?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const savedToken = await storage.getItem('token');
                if (savedToken) {
                    // Set token temporarily for the request (interceptor handles it usually, but initial request might race?)
                    // The interceptor reads from SecureStore, so it should be fine.
                    // But we likely want to fail fast.
                    try {
                        const { data } = await getProfile();
                        setUser(data);
                        setToken(savedToken);
                        connectSocket(savedToken);
                    } catch (err) {
                        console.log('Profile fetch failed, clearing token');
                        await storage.deleteItem('token');
                        setToken(null);
                    }
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        const handleUnauthorized = () => {
            console.log('AuthContext: Received unauthorized event, logging out...');
            logout();
        };

        const subscription = DeviceEventEmitter.addListener('auth:unauthorized', handleUnauthorized);
        initAuth();

        return () => {
             subscription.remove();
        };
    }, []);

    const login = async (username: string, password: string) => {
        const { data } = await apiLogin(username, password);
        await storage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        connectSocket(data.token);
    };

    const register = async (username: string, email: string, password: string, displayName?: string) => {
        console.log('AuthContext: Calling apiRegister...');
        const { data } = await apiRegister(username, email, password, displayName);
        console.log('AuthContext: Registration successful, received data:', data);
        await storage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        connectSocket(data.token);
    };

    const logout = async () => {
        await storage.deleteItem('token');
        setToken(null);
        setUser(null);
        disconnectSocket();
    };

    const updateProfile = async (displayName?: string, avatarUrl?: string) => {
        const { data } = await api.put('/auth/profile', { displayName, avatarUrl });
        setUser(prev => prev ? { ...prev, displayName: data.displayName, avatarUrl: data.avatarUrl } : null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfile }}>
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
