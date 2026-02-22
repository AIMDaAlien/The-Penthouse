import React, { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { getSocket } from '../services/socket';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { Audio } from 'expo-av';
import { AppState } from 'react-native';

export function NotificationListener() {
    const { user } = useAuth();
    const { show } = useToast();
    const router = useRouter();
    const segments = useSegments();
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        const socket = getSocket();
        if (!socket || !user) return;

        const handleNewMessage = async (message: any) => {
            // 1. Ignore own messages
            if (message.sender.id === user.id) return;

            // 2. Check if we are currently in this chat
            // segments for chat screen are typically: ["(main)", "chat", "[id]"]
            // or just ["chat", "[id]"] depending on navigation structure
            const inChatRoute = segments.includes('chat') && segments.includes('[id]');
            // We need to get the actual ID from the route params, but useSegments doesn't give params directly.
            // However, we can check if the current path contains the ID? 
            // Better approach: segments[segments.length - 1] might be the ID if it's resolved? 
            // Actually expo-router segments are the route names, not the param values usually?
            // Wait, useGlobalSearchParams could work but it changes. 
            // Let's use a simpler heuristic for now: check if we are in a chat screen.
            
            // Actually, we can get parameters via `useGlobalSearchParams` if needed, 
            // but `segments` usually returns the file names like `[id]`.
            // Let's rely on `router.canGoBack` or checking the path more carefully if needed.
            // For now, let's just trigger it and refine if it interacts poorly.
            
            // Re-evaluating: We really want to know the current chat ID.
            // If we are in `app/chat/[id].tsx`, how do we know `id`?
            // We can't easily access the params of the *active* screen from a global component without context hacks.
            
            // However, we can check AppState. If background, push notification handles it.
            // This component handles FOREGROUND.
            if (AppState.currentState !== 'active') return;

            // Simple "Double Take" logic: 
            // If we receive a message and we are NOT in that specific chat (rudimentary check), show toast.
            // Since we can't easily get the active Chat ID here without a global store, 
            // we'll show the toast. If the user is IN that chat, they will see the message appear in the list anyway,
            // so a toast might be redundant but acceptable "notification" that it arrived.
            // TO IMPROVE: We could store `currentChatId` in a global store (Zustand/Context).
            
            // Play subtle sound
            try {
                // Pre-load sound if not loaded? Or just skip for MVP polish.
                // await Audio.Sound.createAsync(require('../../assets/sounds/notification.mp3'));
            } catch (e) {
                // ignore
            }

            show({
                message: `${message.sender.displayName || message.sender.username}: ${message.content}`,
                title: `New Message in ${message.chatName || 'Chat'}`,
                variant: 'info',
                action: () => {
                    router.push(`/chat/${message.chatId}`);
                },
                duration: 4000
            });
        };

        socket.on('message:new', handleNewMessage);

        return () => {
            socket.off('message:new', handleNewMessage);
        };
    }, [user, segments, show, router]);

    return null; // Headless component
}
