import { useState, useRef, useCallback, useEffect } from 'react';
import {
    getMessages,
    getPinnedMessages,
    sendMessage as apiSendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    addReaction,
    removeReaction,
    uploadVoice,
    uploadFile
} from '../services/api';
import { getSocket, stopTyping, joinChat, leaveChat } from '../services/socket';
import type { Chat, Message, User } from '../types';

interface UseMessagesReturn {
    // State
    messages: Message[];
    editingMessage: Message | null;
    editContent: string;
    setEditContent: (content: string) => void;
    pinnedMessages: Message[];
    typingUsers: Map<number, string>;
    replyingTo: Message | null;
    setReplyingTo: (msg: Message | null) => void;

    // Actions
    loadMessages: (chatId: number) => Promise<void>;
    sendMessage: (content: string, type: 'text' | 'gif' | 'image' | 'file' | 'voice', metadata?: object, replyToId?: number) => Promise<void>;
    handleFileSelect: (file: any) => Promise<void>;
    handleVoiceSend: (audioUri: string, duration: number, mimeType: string) => Promise<void>;
    handleEditMessage: (msg: Message) => void;
    handleSaveEdit: () => Promise<void>;
    handleCancelEdit: () => void;
    handleDeleteMessage: (msgId: number) => void;
    handleConfirmDelete: () => Promise<void>;
    handlePinMessage: (msgId: number) => Promise<void>;
    handleUnpinMessage: (msgId: number) => Promise<void>;
    handleReact: (messageId: number, emoji: string) => Promise<void>;
    loadPinnedMessages: (chatId: number) => Promise<void>;
    clearMessages: () => void;

    // Refs (Mobile: Use FlatList Ref manually in component)
    // messagesEndRef: React.RefObject<HTMLDivElement | null>; 
}

export function useMessages(
    selectedChat: Chat | null,
    user: User | null,
    onChatUpdate?: () => void
): UseMessagesReturn {
    // Messages state
    const [messages, setMessages] = useState<Message[]>([]);

    // Edit state
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editContent, setEditContent] = useState('');
    const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);

    // Pinned messages
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);

    // Reply state
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    // Typing indicator state
    const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
    const typingTimeouts = useRef<Map<number, number>>(new Map());

    // Load messages for a chat
    const loadMessages = useCallback(async (chatId: number) => {
        try {
            const { data } = await getMessages(chatId);
            setMessages(data);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    }, []);

    // Clear messages when switching chats
    const clearMessages = useCallback(() => {
        setMessages([]);
        setTypingUsers(new Map());
    }, []);

    // Load pinned messages for a chat
    const loadPinnedMessages = useCallback(async (chatId: number) => {
        try {
            const { data } = await getPinnedMessages(chatId);
            setPinnedMessages(data);
        } catch (err) {
            console.error('Failed to load pinned messages:', err);
        }
    }, []);

    // Join/leave socket room when chat changes (CRITICAL for real-time updates)
    useEffect(() => {
        if (!selectedChat) return;

        console.log('🔌 Joining chat room:', selectedChat.id);
        joinChat(selectedChat.id);

        return () => {
            console.log('🔌 Leaving chat room:', selectedChat.id);
            leaveChat(selectedChat.id);
        };
    }, [selectedChat?.id]);

    // Socket event listeners
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleNewMessage = (message: Message) => {
            if (selectedChat && Number(message.chatId) === Number(selectedChat.id)) {
                setMessages(prev => {
                    // Check for duplicates by:
                    // 1. Same message ID
                    // 2. Same nonce (for optimistic updates)
                    // 3. Same sender, content, and recent timestamp (fallback)
                    const isDuplicate = prev.some(m => {
                        if (m.id === message.id) return true;
                        if (m.nonce && message.nonce && m.nonce === message.nonce) return true;
                        // Check for optimistic message by matching sender+content within 5 seconds
                        if (m.sender?.id === message.sender?.id &&
                            m.content === message.content &&
                            m.id > 1000000000000 && // Temp IDs are timestamps (large numbers)
                            Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000) {
                            return true;
                        }
                        return false;
                    });

                    if (isDuplicate) {
                        // Replace optimistic message with real message
                        return prev.map(m => {
                            if (m.nonce && message.nonce && m.nonce === message.nonce) return message;
                            if (m.id > 1000000000000 &&
                                m.sender?.id === message.sender?.id &&
                                m.content === message.content) return message;
                            return m;
                        });
                    }
                    return [...prev, message];
                });
                setTypingUsers(prev => {
                    const next = new Map(prev);
                    next.delete(message.sender.id);
                    return next;
                });
            }
            onChatUpdate?.();
        };

        const handleUserTyping = (data: { chatId: number; userId: number; username: string }) => {
            if (selectedChat?.id === data.chatId) {
                setTypingUsers(prev => {
                    const next = new Map(prev);
                    next.set(data.userId, data.username);
                    return next;
                });
                const existingTimeout = typingTimeouts.current.get(data.userId);
                if (existingTimeout) clearTimeout(existingTimeout);
                const timeout = setTimeout(() => {
                    setTypingUsers(prev => {
                        const next = new Map(prev);
                        next.delete(data.userId);
                        return next;
                    });
                }, 3000) as unknown as number;
                typingTimeouts.current.set(data.userId, timeout);
            }
        };

        const handleUserStopTyping = (data: { chatId: number; userId: number }) => {
            if (selectedChat?.id === data.chatId) {
                setTypingUsers(prev => {
                    const next = new Map(prev);
                    next.delete(data.userId);
                    return next;
                });
                const existingTimeout = typingTimeouts.current.get(data.userId);
                if (existingTimeout) clearTimeout(existingTimeout);
            }
        };

        const handleMessageEdited = (data: { messageId: number; chatId: number; content: string; editedAt: string }) => {
            if (selectedChat?.id === data.chatId) {
                setMessages(prev => prev.map(msg =>
                    msg.id === data.messageId
                        ? { ...msg, content: data.content, editedAt: data.editedAt }
                        : msg
                ));
            }
            onChatUpdate?.();
        };

        const handleMessageDeleted = (data: { messageId: number; chatId: number; deletedAt: string }) => {
            if (selectedChat?.id === data.chatId) {
                setMessages(prev => prev.map(msg =>
                    msg.id === data.messageId
                        ? { ...msg, deletedAt: data.deletedAt }
                        : msg
                ));
            }
            onChatUpdate?.();
        };

        const handleMessageRead = (data: { messageId: number; chatId: number; readAt: string }) => {
            if (selectedChat?.id === data.chatId) {
                setMessages(prev => prev.map(msg =>
                    msg.id === data.messageId
                        ? { ...msg, readAt: data.readAt }
                        : msg
                ));
            }
        };

        const handleReactionUpdate = (data: { messageId: number; chatId: number; reactions: Array<{ emoji: string; userId: number; username: string; displayName?: string }> }) => {
            if (selectedChat?.id === data.chatId) {
                setMessages(prev => prev.map(msg =>
                    msg.id === data.messageId
                        ? { ...msg, reactions: data.reactions }
                        : msg
                ));
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stop_typing', handleUserStopTyping);
        socket.on('message_edited', handleMessageEdited);
        socket.on('message_deleted', handleMessageDeleted);
        socket.on('message_read', handleMessageRead);
        socket.on('reaction_update', handleReactionUpdate);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stop_typing', handleUserStopTyping);
            socket.off('message_edited', handleMessageEdited);
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_read', handleMessageRead);
            socket.off('reaction_update', handleReactionUpdate);
        };
    }, [selectedChat, onChatUpdate]);

    const sendMessage = useCallback(async (content: string, type: 'text' | 'gif' | 'image' | 'file' | 'voice', metadata?: object, replyToId?: number) => {
        if (!selectedChat || !user) return;

        const tempId = Date.now();
        const nonce = `${tempId}`;
        
        // Optimistic Message
        const optimisticMessage: any = {
            id: tempId,
            chatId: selectedChat.id,
            senderId: user.id,
            content,
            type,
            metadata: metadata || {},
            replyToId,
            createdAt: new Date().toISOString(),
            sender: user,
            reactions: [],
            nonce // Custom field to track optimistic messages
        };

        setMessages(prev => [...prev, optimisticMessage]);

        try {
            stopTyping(selectedChat.id);
            // Pass nonce if API supports it, otherwise we rely on socket to replace it or we filter duplicates
            await apiSendMessage(selectedChat.id, content, type, { ...metadata, nonce }, replyToId);
            setReplyingTo(null);
        } catch (err) {
            console.error('Failed to send message:', err);
            // Optionally mark message as failed in UI
            setMessages(prev => prev.filter(m => m.id !== tempId)); // Revert on failure
        }
    }, [selectedChat, user]);

    const handleFileSelect = useCallback(async (file: any) => {
        if (!selectedChat) return;
        try {
            const uploadRes = await uploadFile(file);
            const isImage = file.type && file.type.startsWith('image/');

            if (isImage) {
                // Send as image message with URL as content
                await apiSendMessage(selectedChat.id, uploadRes.data.url, 'image', {
                    fileName: file.name,
                    mimeType: file.type
                });
            } else {
                // Send as file message
                await apiSendMessage(selectedChat.id, `📎 ${file.name}`, 'file', {
                    fileName: file.name,
                    fileUrl: uploadRes.data.url
                });
            }
        } catch (err) {
             console.error('Failed to send file:', err);
        }
    }, [selectedChat]);

    const handleVoiceSend = useCallback(async (audioUri: string, duration: number, mimeType: string) => {
        if (!selectedChat) return;
        try {
            const { data } = await uploadVoice(audioUri, duration, mimeType);
            await apiSendMessage(selectedChat.id, data.url, 'voice', data.params);
        } catch (err) {
            console.error('Failed to send voice message:', err);
        }
    }, [selectedChat]);

    const handleEditMessage = useCallback((msg: Message) => {
        setEditingMessage(msg);
        setEditContent(msg.content);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingMessage(null);
        setEditContent('');
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingMessage || !editContent.trim()) return;
        try {
            await editMessage(editingMessage.id, editContent);
            setMessages(prev => prev.map(msg =>
                msg.id === editingMessage.id
                    ? { ...msg, content: editContent, editedAt: new Date().toISOString() }
                    : msg
            ));
            setEditingMessage(null);
            setEditContent('');
        } catch (err) {
            console.error('Failed to edit message:', err);
        }
    }, [editingMessage, editContent]);

    const handleDeleteMessage = useCallback((msgId: number) => {
        setDeleteMessageId(msgId);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteMessageId) return;
        try {
            await deleteMessage(deleteMessageId);
            setMessages(prev => prev.map(msg =>
                msg.id === deleteMessageId
                    ? { ...msg, deletedAt: new Date().toISOString() }
                    : msg
            ));
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
        setDeleteMessageId(null);
    }, [deleteMessageId]);

    const handlePinMessage = useCallback(async (msgId: number) => {
        if (!selectedChat) return;
        try {
            await pinMessage(msgId);
             // Optimistic update?
            await loadPinnedMessages(selectedChat.id);
        } catch (err) {
            console.error('Failed to pin message:', err);
        }
    }, [selectedChat, loadPinnedMessages]);

    const handleUnpinMessage = useCallback(async (msgId: number) => {
        if (!selectedChat) return;
        try {
            await unpinMessage(msgId);
            setPinnedMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            console.error('Failed to unpin message:', err);
        }
    }, [selectedChat]);

    const handleReact = useCallback(async (messageId: number, emoji: string) => {
        // Optimistic update logic similar to web
        const message = messages.find(m => m.id === messageId);
        const existingReactions = message?.reactions || [];
        const hasReacted = existingReactions.some(r => r.emoji === emoji && r.userId === user?.id);

        try {
            if (hasReacted) {
                await removeReaction(messageId, emoji);
                setMessages(prev => prev.map(m => {
                    if (m.id === messageId) {
                        return {
                            ...m,
                            reactions: (m.reactions || []).filter(r => !(r.emoji === emoji && r.userId === user?.id))
                        };
                    }
                    return m;
                }));
            } else {
                await addReaction(messageId, emoji);
                setMessages(prev => prev.map(m => {
                     if (m.id === messageId) {
                        return {
                            ...m,
                            reactions: [...(m.reactions || []), { emoji, userId: user!.id, username: user!.username, displayName: user?.displayName }]
                        };
                    }
                    return m;
                }));
            }
        } catch (err) {
            console.error('Failed to toggle reaction:', err);
        }
    }, [messages, user]);

    return {
        messages,
        editingMessage,
        editContent,
        setEditContent,
        pinnedMessages,
        typingUsers,
        replyingTo,
        setReplyingTo,
        loadMessages,
        sendMessage,
        handleFileSelect,
        handleVoiceSend,
        handleEditMessage,
        handleSaveEdit,
        handleCancelEdit,
        handleDeleteMessage,
        handleConfirmDelete,
        handlePinMessage,
        handleUnpinMessage,
        handleReact,
        loadPinnedMessages,
        clearMessages,
    };
}
