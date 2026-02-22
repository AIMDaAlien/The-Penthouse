import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

import { Platform } from 'react-native';
import { setServerOffline, setServerOnline } from './serverStatus';

// Detect machine IP for development
const origin = Constants.expoConfig?.hostUri?.split(':')[0];
const SOCKET_URL = origin 
  ? `http://${origin}:3000` 
  : (Platform.OS === 'web' && __DEV__) 
    ? 'http://localhost:3000' 
    : 'https://api.penthouse.blog';

console.log('Socket URL:', SOCKET_URL);

let socket: Socket | null = null;
let offlineTimer: ReturnType<typeof setTimeout> | null = null;
const OFFLINE_GRACE_MS = 3500;

const clearOfflineTimer = () => {
    if (!offlineTimer) return;
    clearTimeout(offlineTimer);
    offlineTimer = null;
};

const scheduleOffline = (reason: string) => {
    clearOfflineTimer();
    offlineTimer = setTimeout(() => {
        setServerOffline(reason);
        offlineTimer = null;
    }, OFFLINE_GRACE_MS);
};

export const connectSocket = (token: string): Socket => {
    if (socket?.connected) {
        return socket;
    }

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        forceNew: true // Ensure fresh connection
    });

    socket.on('connect', () => {
        console.log('🔌 Connected to WebSocket');
        clearOfflineTimer();
        setServerOnline();
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from WebSocket:', reason);
        // Expected disconnect (logout/app cleanup) should not trip global offline UI.
        if (reason === 'io client disconnect') return;
        // Give auto-reconnect a short grace window before marking the app offline.
        scheduleOffline(`WebSocket disconnected (${reason})`);
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        scheduleOffline(error.message || 'WebSocket error');
    });

    return socket;
};

export const disconnectSocket = () => {
    clearOfflineTimer();
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = (): Socket | null => socket;

export const joinChat = (chatId: number) => {
    socket?.emit('join_chat', chatId);
};

export const leaveChat = (chatId: number) => {
    socket?.emit('leave_chat', chatId);
};

export const sendTyping = (chatId: number) => {
    socket?.emit('typing', chatId);
};

export const stopTyping = (chatId: number) => {
    socket?.emit('stop_typing', chatId);
};
