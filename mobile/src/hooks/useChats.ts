import { useState, useCallback } from 'react';
import { getChats, createGroup } from '../services/api';
import type { Chat, User } from '../types';

export interface UseChatsReturn {
    chats: Chat[];
    selectedChat: Chat | null;
    setSelectedChat: (chat: Chat | null) => void;
    loadChats: () => Promise<void>;
    selectChat: (chat: Chat) => void;
    createNewGroup: (name: string) => Promise<void>;
}

export function useChats(user: User | null): UseChatsReturn {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

    const loadChats = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await getChats();
            setChats(data);
        } catch (error) {
            console.error('Failed to load chats:', error);
        }
    }, [user]);

    const selectChat = useCallback((chat: Chat) => {
        // Logic for joining/leaving socket rooms is handled by useMessages hook
        // which reacts to selectedChat changes.
        
        const completeChat: Chat = {
            ...chat,
            isGroup: chat.type === 'group' || chat.type === 'channel',
            type: chat.type || ((chat.type as string) === 'group' || chat.isGroup ? 'group' : 'dm')
        };
        
        setSelectedChat(completeChat);
    }, []);

    const createNewGroup = useCallback(async (name: string) => {
        await createGroup(name);
        await loadChats();
    }, [loadChats]);

    return {
        chats,
        selectedChat,
        setSelectedChat,
        loadChats,
        selectChat,
        createNewGroup
    };
}
