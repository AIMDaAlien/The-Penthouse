import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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

export const sendMessage = (chatId: number, content: string, type = 'text', metadata?: object) =>
    api.post(`/messages/${chatId}`, { content, type, metadata });

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
