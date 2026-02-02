import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { login as apiLogin, register as apiRegister, getProfile } from '../services/api';
import { authEvents } from '../services/events';
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
    register: (username: string, password: string, displayName?: string) => Promise<void>;
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
                const savedToken = await SecureStore.getItemAsync('token');
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
                        await SecureStore.deleteItemAsync('token');
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

        authEvents.addEventListener('unauthorized', handleUnauthorized);
        initAuth();

        return () => {
             authEvents.removeEventListener('unauthorized', handleUnauthorized);
        };
    }, []);

    const login = async (username: string, password: string) => {
        const { data } = await apiLogin(username, password);
        await SecureStore.setItemAsync('token', data.token);
        setToken(data.token);
        setUser(data.user);
        connectSocket(data.token);
    };

    const register = async (username: string, password: string, displayName?: string) => {
        console.log('AuthContext: Calling apiRegister...');
        const { data } = await apiRegister(username, password, displayName);
        console.log('AuthContext: Registration successful, received data:', data);
        await SecureStore.setItemAsync('token', data.token);
        setToken(data.token);
        setUser(data.user);
        connectSocket(data.token);
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('token');
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
