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
    : 'https://penthouse.blog';

console.log('Socket URL:', SOCKET_URL);

let socket: Socket | null = null;

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
        setServerOnline();
    });

    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from WebSocket');
        setServerOffline('WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        setServerOffline(error.message || 'WebSocket error');
    });

    return socket;
};

export const disconnectSocket = () => {
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
