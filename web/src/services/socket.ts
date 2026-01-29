import { io, Socket } from 'socket.io-client';

// In production, connect to the same origin. In development, use localhost:3000
const SOCKET_URL = import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:3000';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
    if (socket?.connected) {
        return socket;
    }

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });

    socket.on('connect', () => {
        console.log('🔌 Connected to WebSocket');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from WebSocket');
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
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
