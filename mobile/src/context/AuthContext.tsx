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
    email?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => Promise<void>;
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

        const handleTokenRefreshed = async (newToken: string) => {
            console.log('AuthContext: Received token refreshed event');
            setToken(newToken);
            connectSocket(newToken);
        };

        const subscriptionRefreshed = DeviceEventEmitter.addListener('auth:token_refreshed', handleTokenRefreshed);
        const subscription = DeviceEventEmitter.addListener('auth:unauthorized', handleUnauthorized);
        initAuth();

        return () => {
             subscription.remove();
             subscriptionRefreshed.remove();
        };
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const { data } = await apiLogin(username, password);
            console.log('[AuthContext] Login successful');
            await storage.setItem('token', data.accessToken || data.token);
            if (data.refreshToken) {
                await storage.setItem('refreshToken', data.refreshToken);
            }
            setToken(data.accessToken || data.token);
            setUser(data.user);
            connectSocket(data.accessToken || data.token);
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        }
    };

    const register = async (username: string, email: string, password: string, displayName?: string) => {
        try {
            const { data } = await apiRegister(username, email, password, displayName);
            console.log('[AuthContext] Registration successful');
            await storage.setItem('token', data.accessToken || data.token);
            if (data.refreshToken) {
                await storage.setItem('refreshToken', data.refreshToken);
            }
            setToken(data.accessToken || data.token);
            setUser(data.user);
            connectSocket(data.accessToken || data.token);
        } catch (error) {
            console.error('[AuthContext] Registration failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        await storage.deleteItem('token');
        await storage.deleteItem('refreshToken');
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
