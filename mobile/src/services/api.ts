import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { Message } from '../types';
import { authEvents } from './events';

// Detect machine IP for development (localhost doesn't work on Android)
const origin = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
const API_URL = `http://${origin}:3000/api`;

console.log('API URL:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync('token');
            authEvents.dispatchEvent(new Event('unauthorized'));
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

export const uploadFile = (file: RNFile) => {
    const formData = new FormData();
    // React Native expects: { uri, name, type }
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || file.type || 'application/octet-stream'
    } as any);
    
    return api.post<{ url: string; type: 'image' | 'video' | 'file'; mimeType: string; filename: string }>('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const uploadVoice = (audioUri: string, duration: number, mimeType = 'audio/x-m4a') => {
    const formData = new FormData();
    const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm';
    
    formData.append('voice', {
        uri: audioUri,
        name: `voice_message.${ext}`,
        type: mimeType
    } as any);
    
    formData.append('duration', duration.toString());
    return api.post<{ url: string; params: { fileName: string; duration: number; mimeType: string } }>('/media/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const joinServer = (code: string) =>
    api.post<{ success: true; serverId: number; channelId?: number; alreadyMember?: boolean }>(`/invites/${code}/join`);

// Auth
export const register = (username: string, password: string, displayName?: string) =>
    api.post('/auth/register', { username, password, displayName });

export const login = (username: string, password: string) =>
    api.post('/auth/login', { username, password });

export const getProfile = () => api.get('/auth/me');

// Chats
export const getChats = () => api.get('/chats');
export const createGroup = (name: string, memberIds?: number[]) =>
    api.post('/chats/group', { name, memberIds });
export const startDm = (userId: number) => api.post('/chats/dm', { userId });
export const getChatDetails = (chatId: number) => api.get(`/chats/${chatId}`);
export const searchUsers = (q?: string) => api.get('/chats/users/search', { params: { q } });

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

export default api;
