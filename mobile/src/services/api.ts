import axios from 'axios';
import { storage } from './storage';
import Constants from 'expo-constants';
import type { Message } from '../types';

// Detect machine IP for development (localhost doesn't work on Android)
const origin = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
const BASE_URL = `http://${origin}:3001`;
const API_URL = `${BASE_URL}/api`;

console.log('API URL:', API_URL);

// Helper to convert relative upload paths to absolute URLs
export const getMediaUrl = (path: string | undefined | null): string => {
    if (!path) return '';
    // Already absolute URL (e.g., GIPHY URLs)
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    // Relative path from server (e.g., /uploads/file.jpg)
    return `${BASE_URL}${path}`;
};

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
    const token = await storage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

import { DeviceEventEmitter } from 'react-native';

// Handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await storage.deleteItem('token');
            DeviceEventEmitter.emit('auth:unauthorized');
            console.log('401 detected, token deleted');
        }
        return Promise.reject(error);
    }
);

// Invites
export const createInvite = (serverId: number, maxUses?: number) =>
    api.post<{ success: true; code: string }>(`/invites/server/${serverId}`, { maxUses });

export const getInvite = (code: string) =>
    api.get<{ code: string; serverName: string; memberCount: number; uses: number }>(`/invites/${code}`);

export interface RNFile {
    uri: string;
    name: string;
    mimeType?: string;
    type?: string;
}

export const uploadFile = async (file: RNFile): Promise<{ data: { url: string; type: 'image' | 'video' | 'file'; mimeType: string; filename: string } }> => {
    const formData = new FormData();
    // React Native expects: { uri, type, name }
    formData.append('file', {
        uri: file.uri,
        type: file.mimeType || file.type || 'application/octet-stream',
        name: file.name
    } as any);

    // Use native fetch for file uploads (more reliable in React Native)
    const token = await storage.getItem('token');
    const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // Let fetch auto-set Content-Type with boundary for FormData
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return { data };
};

export const uploadVoice = async (audioUri: string, duration: number, mimeType = 'audio/x-m4a'): Promise<{ data: { url: string; params: { fileName: string; duration: number; mimeType: string } } }> => {
    const formData = new FormData();
    const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm';

    formData.append('voice', {
        uri: audioUri,
        name: `voice_message.${ext}`,
        type: mimeType
    } as any);

    formData.append('duration', duration.toString());

    // Use native fetch for file uploads (more reliable in React Native)
    const token = await storage.getItem('token');
    const response = await fetch(`${API_URL}/media/voice`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Voice upload failed:', response.status, errorText);
        throw new Error(`Voice upload failed: ${response.status}`);
    }

    const data = await response.json();
    return { data };
};

export const joinServer = (code: string) =>
    api.post<{ success: true; serverId: number; channelId?: number; alreadyMember?: boolean }>(`/invites/${code}/join`);

// Auth
export const register = (username: string, password: string, displayName?: string) =>
    api.post('/auth/register', { username, password, displayName });

export const login = (username: string, password: string) =>
    api.post('/auth/login', { username, password });

export const getProfile = () => api.get('/auth/me');

export const updateProfile = (displayName?: string, avatarUrl?: string) =>
    api.put('/auth/profile', { displayName, avatarUrl });

export const uploadAvatar = async (file: RNFile): Promise<{ data: { avatarUrl: string } }> => {
    const formData = new FormData();
    formData.append('avatar', {
        uri: file.uri,
        type: file.mimeType || file.type || 'image/jpeg',
        name: file.name
    } as any);

    const token = await storage.getItem('token');
    const response = await fetch(`${API_URL}/media/avatar`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Avatar upload failed:', response.status, errorText);
        throw new Error(`Avatar upload failed: ${response.status}`);
    }

    const data = await response.json();
    return { data };
};

// Chats
export const getChats = () => api.get('/chats');
export const createGroup = (name: string, memberIds?: number[]) =>
    api.post('/chats/group', { name, memberIds });
export const startDm = (userId: number) => api.post('/chats/dm', { userId });
export const getChatDetails = (chatId: number) => api.get(`/chats/${chatId}`);
export const searchUsers = (q?: string) => api.get('/chats/users/search', { params: { q } });
export const getUnreadCounts = () => api.get<{ unread: Array<{ chatId: number; count: number }> }>('/chats/unread');

// Messages
export const getMessages = (chatId: number, limit = 50, before?: number) =>
    api.get(`/messages/${chatId}`, { params: { limit, before } });

export const sendMessage = (chatId: number, content: string, type = 'text', metadata?: object, replyTo?: number) =>
    api.post(`/messages/${chatId}`, { content, type, metadata, replyTo });

export const editMessage = (messageId: number, content: string) =>
    api.put(`/messages/${messageId}`, { content });

export const deleteMessage = (messageId: number) =>
    api.delete(`/messages/${messageId}`);

export const markMessageRead = (messageId: number) =>
    api.post(`/messages/${messageId}/read`);

// Pinning
export const pinMessage = (messageId: number) =>
    api.post(`/messages/${messageId}/pin`);

export const unpinMessage = (messageId: number) =>
    api.delete(`/messages/${messageId}/pin`);

export const getPinnedMessages = (chatId: number) =>
    api.get<Message[]>(`/messages/pins/${chatId}`);

// Reactions
export const addReaction = (messageId: number, emoji: string) =>
    api.post(`/messages/${messageId}/react`, { emoji });

export const removeReaction = (messageId: number, emoji: string) =>
    api.delete(`/messages/${messageId}/react/${encodeURIComponent(emoji)}`);

// Media
export const getEmotes = () => api.get('/media/emotes');

// Servers
export const getServers = () => api.get('/servers');
export const createServer = (name: string, iconUrl?: string) =>
    api.post('/servers', { name, iconUrl });
export const getServerDetails = (serverId: number) => api.get(`/servers/${serverId}`);
export const createChannel = (serverId: number, name: string) =>
    api.post(`/servers/${serverId}/channels`, { name });

export const uploadServerIcon = async (file: RNFile): Promise<{ data: { iconUrl: string } }> => {
    const formData = new FormData();
    formData.append('icon', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || 'server-icon.jpg'
    } as any);

    const token = await storage.getItem('token');
    const response = await fetch(`${API_URL}/media/server-icon`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Server icon upload failed:', response.status, errorText);
        throw new Error(`Server icon upload failed: ${response.status}`);
    }

    const data = await response.json();
    return { data };
};

export default api;
