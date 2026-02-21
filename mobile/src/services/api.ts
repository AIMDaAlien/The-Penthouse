import axios from 'axios';
import { storage } from './storage';
import Constants from 'expo-constants';
import type { Message } from '../types';

import { Platform } from 'react-native';

// Detect machine IP for development (localhost doesn't work on Android)

// In standalone builds (APK), hostUri will be undefined, so we default to the production domain.
const origin = Constants.expoConfig?.hostUri?.split(':')[0];
const BASE_URL = origin 
  ? `http://${origin}:3000` 
  : (Platform.OS === 'web' && __DEV__) 
    ? 'http://localhost:3000' 
    : 'https://api.penthouse.blog';
const API_URL = `${BASE_URL}/api`;

if (__DEV__) {
    console.log('API URL:', API_URL);
}

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
import { setServerOffline, setServerOnline } from './serverStatus';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Handle 401
api.interceptors.response.use(
    (response) => {
        // Any successful response implies reachability.
        setServerOnline();
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        return axios(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await storage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Call refresh endpoint directly with fetch to avoid interceptor loops
                const response = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });

                if (!response.ok) {
                    throw new Error('Refresh failed');
                }

                const data = await response.json();
                const newAccessToken = data.accessToken;
                const newRefreshToken = data.refreshToken;

                await storage.setItem('token', newAccessToken);
                await storage.setItem('refreshToken', newRefreshToken);

                DeviceEventEmitter.emit('auth:token_refreshed', newAccessToken);

                processQueue(null, newAccessToken);
                originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
                
                // Also update the api defaults if possible (though interceptor reading from storage is usually enough)
                api.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;

                return axios(originalRequest);
            } catch (err) {
                processQueue(err, null);
                await storage.deleteItem('token');
                await storage.deleteItem('refreshToken');
                DeviceEventEmitter.emit('auth:unauthorized');
                console.log('401 detected, refresh failed, token deleted');
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }

        // Network errors/timeouts usually have no response.
        if (!error.response && error.code !== 'ERR_CANCELED') {
            setServerOffline(error.message || 'Network error');
        } else if (error.response?.status >= 500) {
            setServerOffline(`Server error (${error.response.status})`);
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
    let response: Response;
    try {
        response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // Let fetch auto-set Content-Type with boundary for FormData
        },
        body: formData,
        });
    } catch (e: any) {
        setServerOffline(e?.message || 'Upload network error');
        throw e;
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        if (response.status >= 500) setServerOffline(`Upload server error (${response.status})`);
        throw new Error(`Upload failed: ${response.status}`);
    }

    setServerOnline();
    const data = await response.json();
    return { data };
};

export const uploadVoice = async (audioUri: string, duration: number, mimeType = 'audio/x-m4a'): Promise<{ data: { url: string; params: { fileName: string; duration: number; mimeType: string } } }> => {
    const formData = new FormData();
    formData.append('voice', {
        uri: audioUri,
        type: mimeType,
        name: `voice-${Date.now()}.m4a`
    } as any);
    formData.append('duration', duration.toString());

    const token = await storage.getItem('token');
    let response: Response;
    try {
        response = await fetch(`${API_URL}/media/voice`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
        });
    } catch (e: any) {
        setServerOffline(e?.message || 'Upload network error');
        throw e;
    }

    if (!response.ok) {
        if (response.status >= 500) setServerOffline(`Upload server error (${response.status})`);
        throw new Error(`Upload failed: ${response.status}`);
    }

    setServerOnline();
    const data = await response.json();
    return { data };
};

/**
 * Helper to handle API calls with consistent error logging
 */
export const safeApiCall = async <T>(
    apiPromise: Promise<T>,
    onSuccess: (data: T extends { data: infer U } ? U : T) => void,
    onError?: (err: any) => void
) => {
    try {
        const result = await apiPromise;
        // If result has .data property (AxiosResponse), pass that. Otherwise pass result itself.
        // This is a bit of a heuristic to support both Axios and custom fetch wrappers if they return {data}
        const data = (result as any).data !== undefined ? (result as any).data : result;
        onSuccess(data);
    } catch (err) {
        console.error('API Error:', err);
        if (onError) onError(err);
    }
};



export const joinServer = (code: string) =>
    api.post<{ success: true; serverId: number; channelId?: number; alreadyMember?: boolean }>(`/invites/${code}/join`);

// Auth
export const register = (username: string, email: string, password: string, displayName?: string) =>
    api.post('/auth/register', { username, email, password, displayName });

export const login = (username: string, password: string) =>
    api.post('/auth/login', { username, password });

export const getProfile = () => api.get('/auth/me');

export const updateProfile = (displayName?: string, avatarUrl?: string) =>
    api.put('/auth/profile', { displayName, avatarUrl });

// Password Recovery
export const forgotPassword = (email: string) =>
    api.post('/auth/forgot-password', { email });

export const resetPassword = (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword });

export const uploadAvatar = async (file: RNFile): Promise<{ data: { avatarUrl: string } }> => {
    const formData = new FormData();
    formData.append('avatar', {
        uri: file.uri,
        type: file.mimeType || file.type || 'image/jpeg',
        name: file.name
    } as any);

    const token = await storage.getItem('token');
    let response: Response;
    try {
        response = await fetch(`${API_URL}/media/avatar`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
        });
    } catch (e: any) {
        setServerOffline(e?.message || 'Upload network error');
        throw e;
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Avatar upload failed:', response.status, errorText);
        if (response.status >= 500) setServerOffline(`Upload server error (${response.status})`);
        throw new Error(`Avatar upload failed: ${response.status}`);
    }

    setServerOnline();
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
export const createChannel = (serverId: number, name: string, type: 'text' | 'voice' = 'text', vibe: string = 'default') =>
    api.post(`/servers/${serverId}/channels`, { name, type, vibe });

export const updateChannel = (channelId: number, data: { name?: string; topic?: string; vibe?: string }) =>
    api.put(`/channels/${channelId}`, { name: data.name });

export const deleteChannel = (channelId: number) =>
    api.delete(`/channels/${channelId}`);

export const leaveServer = (serverId: number) =>
    api.post(`/servers/${serverId}/leave`);

export const removeServerMember = (serverId: number, userId: number) =>
    api.delete(`/servers/${serverId}/members/${userId}`);

export const transferServerOwnership = (serverId: number, userId: number) =>
    api.post(`/servers/${serverId}/transfer/${userId}`);

export const deleteServer = (serverId: number) =>
    api.delete(`/servers/${serverId}`);

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

// Friends
export const sendFriendRequest = (userId: number) =>
    api.post('/friends/request', { userId });

export const getFriendRequests = () =>
    api.get('/friends/requests');

export const getSentFriendRequests = () =>
    api.get('/friends/requests/sent');

export const acceptFriendRequest = (requestId: number) =>
    api.post(`/friends/accept/${requestId}`);

export const declineFriendRequest = (requestId: number) =>
    api.post(`/friends/decline/${requestId}`);

export const cancelFriendRequest = (userId: number) =>
    api.delete(`/friends/request/${userId}`);

export const getFriends = () =>
    api.get('/friends');

export const removeFriend = (userId: number) =>
    api.delete(`/friends/${userId}`);

export const getFriendshipStatus = (userId: number) =>
    api.get(`/friends/status/${userId}`);

// Blocking
export const blockUser = (userId: number) =>
    api.post(`/friends/block/${userId}`);

export const unblockUser = (userId: number) =>
    api.delete(`/friends/block/${userId}`);

export const getBlockedUsers = () =>
    api.get('/friends/blocked');

// Roles & Permissions (Mock)
export const getRoles = (serverId: number) => {
    // Mock response
    return new Promise<{ data: import('../types').Role[] }>((resolve) => {
        setTimeout(() => {
            resolve({
                data: [
                    { 
                        id: 'role_owner', 
                        name: 'Owner', 
                        color: '#FFD700', // Gold
                        permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS', 'SEND_MESSAGES', 'View_LOCKED_CHANNELS'] 
                    },
                    { 
                        id: 'role_vip', 
                        name: 'VIP', 
                        color: '#D946EF', // Fuchsia
                        permissions: ['SEND_MESSAGES', 'View_LOCKED_CHANNELS'] 
                    },
                    { 
                        id: 'role_guest', 
                        name: 'Guest', 
                        color: '#9CA3AF', // Gray
                        permissions: ['SEND_MESSAGES'] 
                    }
                ]
            });
        }, 500);
    });
};

export const updateChannelPermissions = (channelId: number, roleId: string, allowed: boolean) => {
    // Mock API call
    return new Promise<{ success: boolean }>((resolve) => {
        setTimeout(() => resolve({ success: true }), 500);
    });
};

export default api;
