import { useState, useRef, useCallback, useEffect } from 'react';
import {
    getMessages,
    sendMessage as apiSendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    addReaction,
    removeReaction,
    uploadVoice
} from '../services/api';
import { getSocket, stopTyping } from '../services/socket';
import type { Chat, Message, User } from '../types';

interface UseMessagesReturn {
    // State
    messages: Message[];
    newMessage: string;
    setNewMessage: (msg: string) => void;
    editingMessage: Message | null;
    editContent: string;
    setEditContent: (content: string) => void;
    pinnedMessages: Message[];
    typingUsers: Map<number, string>;
    replyingTo: Message | null;
    setReplyingTo: (msg: Message | null) => void;

    // Actions
    loadMessages: (chatId: number) => Promise<void>;
    handleSend: (e: React.FormEvent) => Promise<void>;
    handleGifSelect: (gifUrl: string) => Promise<void>;
    handleEmojiSelect: (emoji: string) => void;
    handleFileSelect: (file: File) => Promise<void>;
    handleVoiceSend: (audioBlob: Blob, duration: number, mimeType: string) => Promise<void>;
    handleEditMessage: (msg: Message) => void;
    handleSaveEdit: () => Promise<void>;
    handleCancelEdit: () => void;
    handleDeleteMessage: (msgId: number) => void;
    handleConfirmDelete: () => Promise<void>;
    handlePinMessage: (msgId: number) => Promise<void>;
    handleUnpinMessage: (msgId: number) => Promise<void>;
    handleReact: (messageId: number, emoji: string) => Promise<void>;
    clearMessages: () => void;

    // Refs
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    lastTypingEmit: React.RefObject<number>;
}

export function useMessages(
    selectedChat: Chat | null,
    user: User | null,
    onChatUpdate?: () => void
): UseMessagesReturn {
    // Messages state
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const lastTypingEmit = useRef<number>(0);

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

    // Socket event listeners
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleNewMessage = (message: Message) => {
            if (selectedChat && message.chatId === selectedChat.id) {
                setMessages(prev => [...prev, message]);
                // Clear typing indicator when message received
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
                // Auto-clear after 3 seconds
                const existingTimeout = typingTimeouts.current.get(data.userId);
                if (existingTimeout) clearTimeout(existingTimeout);
                const timeout = window.setTimeout(() => {
                    setTypingUsers(prev => {
                        const next = new Map(prev);
                        next.delete(data.userId);
                        return next;
                    });
                }, 3000);
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
                        ? { ...msg, content: data.content, edited_at: data.editedAt }
                        : msg
                ));
            }
            onChatUpdate?.();
        };

        const handleMessageDeleted = (data: { messageId: number; chatId: number; deletedAt: string }) => {
            if (selectedChat?.id === data.chatId) {
                setMessages(prev => prev.map(msg =>
                    msg.id === data.messageId
                        ? { ...msg, deleted_at: data.deletedAt }
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

        socket.on('new_message', handleNewMessage);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stop_typing', handleUserStopTyping);
        socket.on('message_edited', handleMessageEdited);
        socket.on('message_deleted', handleMessageDeleted);
        socket.on('message_read', handleMessageRead);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stop_typing', handleUserStopTyping);
            socket.off('message_edited', handleMessageEdited);
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_read', handleMessageRead);
        };
    }, [selectedChat, onChatUpdate]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send text message
    const handleSend = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        try {
            stopTyping(selectedChat.id);
            await apiSendMessage(selectedChat.id, newMessage.trim(), 'text', undefined, replyingTo?.id);
            setNewMessage('');
            setReplyingTo(null);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    }, [newMessage, selectedChat, replyingTo]);

    // Send GIF
    const handleGifSelect = useCallback(async (gifUrl: string) => {
        if (!selectedChat) return;
        try {
            await apiSendMessage(selectedChat.id, gifUrl, 'gif', { gifUrl });
        } catch (err) {
            console.error('Failed to send GIF:', err);
        }
    }, [selectedChat]);

    // Append emoji to input
    const handleEmojiSelect = useCallback((emoji: string) => {
        setNewMessage(prev => prev + emoji);
    }, []);

    // Send file/image
    const handleFileSelect = useCallback(async (file: File) => {
        if (!selectedChat) return;
        const fileUrl = URL.createObjectURL(file);
        const isImage = file.type.startsWith('image/');

        try {
            if (isImage) {
                await apiSendMessage(selectedChat.id, fileUrl, 'image', { fileName: file.name });
            } else {
                await apiSendMessage(selectedChat.id, `📎 ${file.name}`, 'file', { fileName: file.name, fileUrl });
            }
        } catch (err) {
            console.error('Failed to send file:', err);
        }
    }, [selectedChat]);

    // Send voice message
    const handleVoiceSend = useCallback(async (audioBlob: Blob, duration: number, mimeType: string) => {
        if (!selectedChat) return;
        try {
            const { data } = await uploadVoice(audioBlob, duration, mimeType);
            await apiSendMessage(selectedChat.id, data.url, 'voice', data.params);
        } catch (err) {
            console.error('Failed to send voice message:', err);
        }
    }, [selectedChat]);

    // Edit handlers
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
                    ? { ...msg, content: editContent, edited_at: new Date().toISOString() }
                    : msg
            ));
            setEditingMessage(null);
            setEditContent('');
        } catch (err) {
            console.error('Failed to edit message:', err);
        }
    }, [editingMessage, editContent]);

    // Delete handlers
    const handleDeleteMessage = useCallback((msgId: number) => {
        setDeleteMessageId(msgId);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteMessageId) return;
        try {
            await deleteMessage(deleteMessageId);
            setMessages(prev => prev.map(msg =>
                msg.id === deleteMessageId
                    ? { ...msg, deleted_at: new Date().toISOString() }
                    : msg
            ));
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
        setDeleteMessageId(null);
    }, [deleteMessageId]);

    // Pin handlers
    const handlePinMessage = useCallback(async (msgId: number) => {
        if (!selectedChat) return;
        try {
            await pinMessage(msgId);
            const message = messages.find(m => m.id === msgId);
            if (message) {
                setPinnedMessages(prev => [...prev, { ...message, isPinned: true }]);
                setMessages(prev => prev.map(m =>
                    m.id === msgId ? { ...m, isPinned: true } : m
                ));
            }
        } catch (err) {
            console.error('Failed to pin message:', err);
        }
    }, [selectedChat, messages]);

    const handleUnpinMessage = useCallback(async (msgId: number) => {
        if (!selectedChat) return;
        try {
            await unpinMessage(msgId);
            setPinnedMessages(prev => prev.filter(m => m.id !== msgId));
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, isPinned: false } : m
            ));
        } catch (err) {
            console.error('Failed to unpin message:', err);
        }
    }, [selectedChat]);

    // Reaction handler
    const handleReact = useCallback(async (messageId: number, emoji: string) => {
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
        newMessage,
        setNewMessage,
        editingMessage,
        editContent,
        setEditContent,
        pinnedMessages,
        typingUsers,
        replyingTo,
        setReplyingTo,
        loadMessages,
        handleSend,
        handleGifSelect,
        handleEmojiSelect,
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
        clearMessages,
        messagesEndRef,
        lastTypingEmit,
    };
}
