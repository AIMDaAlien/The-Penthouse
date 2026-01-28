import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getChats,
    getMessages,
    sendMessage,
    createGroup,
    searchUsers,
    getServers,
    createServer,
    getServerDetails,
    createChannel,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    markMessageRead,
    pinMessage,
    unpinMessage,
    getPinnedMessages,
    joinServer,
    uploadVoice
} from '../services/api';
import { getSocket, joinChat, leaveChat, sendTyping, stopTyping } from '../services/socket';
import type { Chat, Message, User, Server, Channel } from '../types';
import GifPicker from '../components/GifPicker';
import KlipyPicker from '../components/KlipyPicker';
import EmojiPicker from '../components/EmojiPicker';
import FileUpload from '../components/FileUpload';
import VoiceRecorder from '../components/VoiceRecorder';
import AudioPlayer from '../components/AudioPlayer';
import { EmojiIcon, GifIcon, AttachmentIcon, SendIcon, EditIcon, TrashIcon, PinIcon, UnpinIcon, ReplyIcon, UsersIcon, KlipyIcon } from '../components/Icons';
import ProfileModal from '../components/ProfileModal';
import InviteModal from '../components/InviteModal';
import ImageLightbox from '../components/ImageLightbox';
import FilePreview from '../components/FilePreview';
import ConfirmModal from '../components/ConfirmModal';
import './Chat.css';

// Random emoji pool for quick reactions


export default function ChatPage() {
    const { user, logout } = useAuth();

    // Global State
    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<number | null>(null);

    // Chat/Channel State
    const [chats, setChats] = useState<Chat[]>([]);
    const [serverChannels, setServerChannels] = useState<Channel[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [serverMembers, setServerMembers] = useState<User[]>([]);

    // Messages State
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Edit State
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editContent, setEditContent] = useState('');
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);

    const [showPins, setShowPins] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showJoinServer, setShowJoinServer] = useState(false);
    const [joinCode, setJoinCode] = useState('');

    // Helpers
    const getChatName = (chat: Chat) => {
        if (chat.name) return chat.name;
        if (chat.type === 'dm') {
            const otherUser = chat.participants?.find(p => p.id !== user?.id);
            return otherUser ? (otherUser.displayName || otherUser.username) : 'Unknown User';
        }
        return 'Untitled Chat';
    };

    // Reply State
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    // Hover State for Random Emoji
    const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);


    // Long-press for mobile
    const longPressTimer = useRef<number | null>(null);
    const [longPressedMsgId, setLongPressedMsgId] = useState<number | null>(null);

    // UI State
    const [users, setUsers] = useState<User[]>([]);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [showNewServer, setShowNewServer] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [inputName, setInputName] = useState('');
    const [showGiphyPicker, setShowGiphyPicker] = useState(false);
    const [showKlipyPicker, setShowKlipyPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Mobile responsiveness state
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);
    const [membersCollapsed, setMembersCollapsed] = useState(() => window.innerWidth < 768);

    // Reaction emoji picker state - tracks which message's picker is open
    const [reactionPickerMsgId, setReactionPickerMsgId] = useState<number | null>(null);

    // Lightbox and File Preview state
    const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);

    // Typing indicator state
    const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
    const typingTimeouts = useRef<Map<number, number>>(new Map());
    const lastTypingEmit = useRef<number>(0);

    // Mobile viewport detection
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Auto-collapse sidebars when switching to mobile
            if (mobile) {
                setSidebarCollapsed(true);
                setMembersCollapsed(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadServers = useCallback(async () => {
        try {
            const { data } = await getServers();
            setServers(data);
        } catch (err) {
            console.error('Failed to load servers:', err);
        }
    }, []);

    const loadServerDetails = useCallback(async (serverId: number) => {
        try {
            const { data } = await getServerDetails(serverId);
            setServerChannels(data.channels);
            setServerMembers(data.members || []);
        } catch (err) {
            console.error('Failed to load server details:', err);
        }
    }, []);

    const loadChats = useCallback(async () => {
        try {
            const { data } = await getChats();
            setChats(data);
        } catch (err) {
            console.error('Failed to load chats:', err);
        }
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            const { data } = await searchUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    }, []);

    useEffect(() => {
        loadServers();
        loadChats();
        loadUsers();

        const socket = getSocket();
        if (socket) {
            socket.on('new_message', (message: Message & { chatId: number }) => {
                if (selectedChat?.id === message.chatId) {
                    setMessages((prev) => [...prev, message]);
                    // Clear typing indicator when message received from that user
                    setTypingUsers(prev => {
                        const next = new Map(prev);
                        next.delete(message.sender.id);
                        return next;
                    });
                }
                loadChats();
            });

            // Typing indicator listeners
            socket.on('user_typing', (data: { chatId: number; userId: number; username: string }) => {
                if (selectedChat?.id === data.chatId) {
                    setTypingUsers(prev => {
                        const next = new Map(prev);
                        next.set(data.userId, data.username);
                        return next;
                    });
                    // Auto-clear after 3 seconds if no update
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
            });

            socket.on('user_stop_typing', (data: { chatId: number; userId: number }) => {
                if (selectedChat?.id === data.chatId) {
                    setTypingUsers(prev => {
                        const next = new Map(prev);
                        next.delete(data.userId);
                        return next;
                    });
                }
            });

            socket.on('message_edited', (data: { messageId: number; chatId: number; content: string; editedAt: string }) => {
                if (selectedChat?.id === data.chatId) {
                    setMessages(prev => prev.map(msg =>
                        msg.id === data.messageId
                            ? { ...msg, content: data.content, edited_at: data.editedAt }
                            : msg
                    ));
                }
                loadChats();
            });

            socket.on('message_deleted', (data: { messageId: number; chatId: number; deletedAt: string }) => {
                if (selectedChat?.id === data.chatId) {
                    setMessages(prev => prev.map(msg =>
                        msg.id === data.messageId
                            ? { ...msg, deleted_at: data.deletedAt }
                            : msg
                    ));
                }
                loadChats();
            });

            socket.on('message_read', (data: { messageId: number; chatId: number; userId: number; readAt: string }) => {
                if (selectedChat?.id === data.chatId) {
                    setMessages(prev => prev.map(msg =>
                        msg.id === data.messageId
                            ? { ...msg, readAt: data.readAt }
                            : msg
                    ));
                }
            });

            socket.on('user_stop_typing', (data: { chatId: number; userId: number }) => {
                if (selectedChat?.id === data.chatId) {
                    setTypingUsers(prev => {
                        const next = new Map(prev);
                        next.delete(data.userId);
                        return next;
                    });
                    const existingTimeout = typingTimeouts.current.get(data.userId);
                    if (existingTimeout) clearTimeout(existingTimeout);
                }
            });
        }

        return () => {
            socket?.off('new_message');
            socket?.off('user_typing');
            socket?.off('user_stop_typing');
        };
    }, [selectedChat, loadServers, loadChats, loadUsers]);

    useEffect(() => {
        if (selectedServerId) {
            loadServerDetails(selectedServerId);
        }
    }, [selectedServerId, loadServerDetails]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleServerSelect = (serverId: number | null) => {
        setSelectedServerId(serverId);
        setSelectedChat(null);
        if (!serverId) {
            setServerChannels([]);
            setServerMembers([]);
        }
    };

    const selectChat = async (chat: Chat) => {
        if (selectedChat) {
            leaveChat(selectedChat.id);
        }

        const completeChat: Chat = {
            ...chat,
            isGroup: chat.type === 'group',
            type: chat.type || (chat.isGroup ? 'group' : 'dm')
        };

        setSelectedChat(completeChat);
        joinChat(completeChat.id);

        // Auto-collapse sidebar on mobile after selecting a chat
        if (isMobile) {
            setSidebarCollapsed(true);
        }

        try {
            const { data } = await getMessages(completeChat.id);
            setMessages(data);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    const handleEditMessage = (msg: Message) => {
        setEditingMessage(msg);
        setEditContent(msg.content);
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditContent('');
    };

    const handleSaveEdit = async () => {
        if (!editingMessage || !editContent.trim()) return;
        try {
            await editMessage(editingMessage.id, editContent);
            setEditingMessage(null);
            setEditContent('');
        } catch (error) {
            console.error('Failed to edit message:', error);
        }
    };

    const handleDeleteMessage = (messageId: number) => {
        setMessageToDelete(messageId);
    };

    const handleConfirmDelete = async () => {
        if (!messageToDelete) return;
        try {
            await deleteMessage(messageToDelete);
            setMessageToDelete(null);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    };

    const handlePinMessage = async (messageId: number) => {
        try {
            await pinMessage(messageId);
        } catch (error) {
            console.error('Failed to pin message:', error);
        }
    };

    const handleUnpinMessage = async (messageId: number) => {
        try {
            await unpinMessage(messageId);
        } catch (error) {
            console.error('Failed to unpin message:', error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        try {
            stopTyping(selectedChat.id); // Stop typing indicator when sending
            await sendMessage(selectedChat.id, newMessage.trim(), 'text', undefined, replyingTo?.id);
            setNewMessage('');
            setReplyingTo(null); // Clear reply state after sending
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleGifSelect = async (gifUrl: string) => {
        if (!selectedChat) return;

        try {
            await sendMessage(selectedChat.id, gifUrl, 'gif', { gifUrl });
        } catch (err) {
            console.error('Failed to send GIF:', err);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleFileSelect = async (file: File) => {
        if (!selectedChat) return;

        // For now, just create a local URL preview
        // In production, you'd upload to server first
        const fileUrl = URL.createObjectURL(file);
        const isImage = file.type.startsWith('image/');

        try {
            if (isImage) {
                await sendMessage(selectedChat.id, fileUrl, 'image', { fileName: file.name });
            } else {
                await sendMessage(selectedChat.id, `📎 ${file.name}`, 'file', { fileName: file.name, fileUrl });
            }
        } catch (err) {
            console.error('Failed to send file:', err);
        }
    };

    const handleVoiceSend = async (audioBlob: Blob, duration: number, mimeType: string) => {
        if (!selectedChat) return;
        try {
            const { data } = await uploadVoice(audioBlob, duration, mimeType);
            await sendMessage(selectedChat.id, data.url, 'voice', data.params);
        } catch (err) {
            console.error('Failed to send voice message:', err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        try {
            if (showNewServer) {
                await createServer(inputName.trim());
                setShowNewServer(false);
                loadServers();
            } else if (showNewGroup) {
                await createGroup(inputName.trim());
                setShowNewGroup(false);
                loadChats();
            } else if (showNewChannel && selectedServerId) {
                await createChannel(selectedServerId, inputName.trim());
                setShowNewChannel(false);
                loadServerDetails(selectedServerId);
            }
            setInputName('');
        } catch (err) {
            console.error('Creation failed:', err);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;

        try {
            const { data } = await joinServer(joinCode.trim());
            if (data.success) {
                setJoinCode('');
                setShowJoinServer(false);
                if (data.alreadyMember) {
                    alert('You are already a member of this server!');
                }
                await loadServers();
                if (data.serverId) {
                    handleServerSelect(data.serverId);
                }
            }
        } catch (err) {
            console.error('Join failed:', err);
            alert('Failed to join server. Check the code and try again.');
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Format exact time with seconds for message timestamp
    const formatExactTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    // Helper for Penthouse timeline - show time marker for first message or after 5+ minute gap
    const shouldShowTimeMarker = (msg: Message, index: number) => {
        if (index === 0) return true;
        const prevMsg = messages[index - 1];
        const currentTime = new Date(msg.createdAt).getTime();
        const prevTime = new Date(prevMsg.createdAt).getTime();
        const gapMinutes = (currentTime - prevTime) / (1000 * 60);
        return gapMinutes >= 5;
    };

    const isGifMessage = (msg: Message) => {
        return msg.type === 'gif' || msg.content?.match(/\.(gif|webp)$/i) || msg.content?.includes('giphy.com');
    };

    const isImageMessage = (msg: Message) => {
        return msg.type === 'image' || msg.content?.match(/\.(jpg|jpeg|png|webp)$/i);
    };

    const handleImageClick = (src: string, alt?: string) => {
        setLightboxImage({ src, alt });
    };

    const handleFileClick = (url: string, name: string, type?: string) => {
        setPreviewFile({ url, name, type });
    };

    const renderMessageContent = (msg: Message) => {
        if (isGifMessage(msg)) {
            return (
                <div className="message-gif clickable" onClick={() => handleImageClick(msg.content, 'GIF')}>
                    <img src={msg.content} alt="GIF" loading="lazy" />
                    <div className="media-overlay"><span>🔍</span></div>
                </div>
            );
        }
        if (isImageMessage(msg)) {
            return (
                <div className="message-image clickable" onClick={() => handleImageClick(msg.content, 'Image')}>
                    <img src={msg.content} alt="Image" loading="lazy" />
                    <div className="media-overlay"><span>🔍</span></div>
                </div>
            );
        }
        // Handle file attachments
        if (msg.type === 'file' && msg.metadata) {
            const meta = msg.metadata as { fileUrl?: string; fileName?: string };
            const isPDF = meta.fileName?.toLowerCase().endsWith('.pdf');
            return (
                <div className="message-file" onClick={() => handleFileClick(meta.fileUrl || '', meta.fileName || 'file')}>
                    <span className="file-icon">{isPDF ? '📄' : '📎'}</span>
                    <span className="file-name">{meta.fileName}</span>
                    <span className="file-action">{isPDF ? 'View' : 'Download'}</span>
                </div>
            );
        }
        if (msg.type === 'voice') {
            return (
                <div className="message-voice">
                    <AudioPlayer src={msg.content} />
                </div>
            );
        }
        return <div className="message-content">{msg.content}</div>;
    };

    // Reaction handler - toggles reaction (add if not reacted, remove if already reacted)
    const handleReact = async (messageId: number, emoji: string) => {
        const message = messages.find(m => m.id === messageId);
        const existingReactions = message?.reactions || [];
        const hasReacted = existingReactions.some(r => r.emoji === emoji && r.userId === user?.id);

        try {
            if (hasReacted) {
                // Remove reaction
                await removeReaction(messageId, emoji);
                // Optimistic update - remove this user's reaction
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
                // Add reaction
                await addReaction(messageId, emoji);
                // Optimistic update - add this user's reaction
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
    };

    // Message hover handlers
    const handleMsgMouseEnter = (msgId: number) => {
        setHoveredMsgId(msgId);
    };

    const handleMsgMouseLeave = () => {
        setHoveredMsgId(null);
    };

    // Long-press handlers for mobile
    const handleMsgTouchStart = (msgId: number) => {
        longPressTimer.current = setTimeout(() => {
            setLongPressedMsgId(msgId);
        }, 500);
    };

    const handleMsgTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    // Group reactions by emoji for Instagram-style display
    const groupReactions = (reactions: Message['reactions']) => {
        if (!reactions) return [];
        const groups: { emoji: string; count: number; users: string[] }[] = [];
        reactions.forEach(r => {
            const existing = groups.find(g => g.emoji === r.emoji);
            if (existing) {
                existing.count++;
                existing.users.push(r.displayName || r.username);
            } else {
                groups.push({ emoji: r.emoji, count: 1, users: [r.displayName || r.username] });
            }
        });
        return groups;
    };

    const displayMembers = selectedServerId ? serverMembers : users;

    // Touch Handling for Mobile Gestures
    const touchStart = useRef<number | null>(null);
    const touchEnd = useRef<number | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            // Swiped Left: Open Members or Close Channels (if open)
            if (!sidebarCollapsed) {
                setSidebarCollapsed(true); // Close left sidebar
            } else if (membersCollapsed) {
                setMembersCollapsed(false); // Open right sidebar
            }
        }

        if (isRightSwipe) {
            // Swiped Right: Open Channels or Close Members (if open)
            if (!membersCollapsed) {
                setMembersCollapsed(true); // Close right sidebar
            } else if (sidebarCollapsed) {
                setSidebarCollapsed(false); // Open left sidebar
            }
        }
    };

    return (
        <div
            className="app-container"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* 1. Server Rail */}
            <nav className="server-rail">
                <div
                    className={`server-icon home-icon ${selectedServerId === null ? 'active' : ''}`}
                    onClick={() => handleServerSelect(null)}
                    title="Home"
                >
                    🏠
                </div>

                {servers.map(server => (
                    <div
                        key={server.id}
                        className={`server-icon ${selectedServerId === server.id ? 'active' : ''}`}
                        onClick={() => handleServerSelect(server.id)}
                        title={server.name}
                    >
                        {server.iconUrl ? (
                            <img src={server.iconUrl} alt={server.name} />
                        ) : (
                            <span>{server.name.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                ))}

                <div
                    className="server-icon add-server-btn"
                    onClick={() => { setShowNewServer(true); setShowNewGroup(false); setShowNewChannel(false); }}
                    title="Create Server"
                >
                    +
                </div>
            </nav>

            {/* 2. Sidebar (Channels or DMs) */}
            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <h2>{selectedServerId ? servers.find(s => s.id === selectedServerId)?.name : 'The Penthouse'}</h2>
                    {selectedServerId && (
                        <button
                            className="collapse-btn"
                            onClick={() => setShowInviteModal(true)}
                            title="Invite People"
                            style={{ marginLeft: 'auto', width: 'auto', padding: '0 8px' }}
                        >
                            + Invite
                        </button>
                    )}
                </div>

                {selectedServerId === null && (
                    <div className="user-panel" onClick={() => setShowProfileModal(true)}>
                        <div className="user-avatar">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="avatar" />
                            ) : (
                                <span>{user?.username?.[0]?.toUpperCase() || '?'}</span>
                            )}
                            <div className="status-indicator online"></div>
                        </div>
                        <div className="user-details">
                            <span className="username">{user?.displayName || user?.username}</span>
                            <span className="user-status">Online</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); logout(); }} className="logout-btn" title="Logout">
                            ⬅
                        </button>
                    </div>
                )}

                <div className="sidebar-actions">
                    {selectedServerId === null ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setShowNewGroup(true); setShowNewServer(false); setShowJoinServer(false); }} className="action-btn">
                                New Group
                            </button>
                            <button onClick={() => { setShowJoinServer(true); setShowNewGroup(false); setShowNewServer(false); }} className="action-btn">
                                Join Server
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => { setShowNewChannel(true); setShowNewServer(false); }} className="action-btn">
                            Create Channel
                        </button>
                    )}
                </div>

                {(showNewGroup || showNewServer || showNewChannel || showJoinServer) && (
                    <div className="creation-form-container">
                        {showJoinServer ? (
                            <form onSubmit={handleJoin} className="creation-form">
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    placeholder="Enter Invite Code..."
                                    autoFocus
                                />
                                <div className="form-actions">
                                    <button type="submit">Join</button>
                                    <button type="button" onClick={() => setShowJoinServer(false)}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleCreate} className="creation-form">
                                <input
                                    type="text"
                                    value={inputName}
                                    onChange={(e) => setInputName(e.target.value)}
                                    placeholder={
                                        showNewServer ? "Server name..." :
                                            showNewGroup ? "Group name..." : "Channel name..."
                                    }
                                    autoFocus
                                />
                                <div className="form-actions">
                                    <button type="submit">Create</button>
                                    <button type="button" onClick={() => {
                                        setShowNewGroup(false);
                                        setShowNewServer(false);
                                        setShowNewChannel(false);
                                    }}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                <div className="channel-list">
                    <h3>{selectedServerId ? 'CHANNELS' : 'DIRECT MESSAGES'}</h3>

                    {selectedServerId === null ? (
                        chats.length === 0 ? (
                            <p className="empty-state">No active chats.</p>
                        ) : (
                            chats.map(chat => (
                                <div
                                    key={chat.id}
                                    className={`channel-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                                    onClick={() => selectChat(chat)}
                                >
                                    <span className="channel-icon">{chat.isGroup ? '👥' : '👤'}</span>
                                    <span className="channel-name">{chat.name || chat.nickname || 'Unknown'}</span>
                                </div>
                            ))
                        )
                    ) : (
                        serverChannels.map(channel => (
                            <div
                                key={channel.id}
                                className={`channel-item ${selectedChat?.id === channel.id ? 'active' : ''}`}
                                onClick={() => selectChat({ ...channel, isGroup: true, type: 'channel', memberCount: 0 })}
                            >
                                <span className="channel-icon">#</span>
                                <span className="channel-name">{channel.name}</span>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* 3. Main Chat Area */}
            <main className="chat-main">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <div className="header-left">
                                {/* Mobile hamburger menu */}
                                {isMobile && (
                                    <button
                                        className="mobile-menu-btn"
                                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                        title="Toggle Menu"
                                    >
                                        ☰
                                    </button>
                                )}
                                <h3>
                                    {selectedChat.type === 'dm' ? '@' : '#'}
                                    {getChatName(selectedChat)}
                                </h3>
                            </div>
                            <div className="header-actions">
                                <button
                                    className={`header-action-btn ${showPins ? 'active' : ''}`}
                                    onClick={() => {
                                        setShowPins(!showPins);
                                        if (!showPins) {
                                            getPinnedMessages(selectedChat.id)
                                                .then(response => setPinnedMessages(response.data))
                                                .catch(console.error);
                                        }
                                    }}
                                    title="Pinned Messages"
                                >
                                    <PinIcon size={18} />
                                </button>
                                <button
                                    className={`toggle-sidebar-btn ${!membersCollapsed ? 'active' : ''}`}
                                    onClick={() => setMembersCollapsed(!membersCollapsed)}
                                    title="Toggle Members"
                                >
                                    <UsersIcon size={18} />
                                </button>
                            </div>
                        </div>

                        {showPins && (
                            <div className="pinned-messages-panel">
                                <div className="pinned-header">
                                    <h4>Pinned Messages</h4>
                                    <button className="close-btn" onClick={() => setShowPins(false)}>×</button>
                                </div>
                                <div className="pinned-list">
                                    {pinnedMessages.length === 0 ? (
                                        <div className="no-pins">No pinned messages yet.</div>
                                    ) : (
                                        pinnedMessages.map(msg => (
                                            <div key={msg.id} className="pinned-item">
                                                <div className="pinned-meta">
                                                    <span className="pinner">Pinned by {msg.pinnedBy || 'Unknown'}</span>
                                                    <span className="pin-time">
                                                        {msg.pinnedAt ? new Date(msg.pinnedAt).toLocaleDateString() : ''}
                                                    </span>
                                                    <button
                                                        className="unpin-btn"
                                                        onClick={() => msg.id && handleUnpinMessage(msg.id)}
                                                        title="Unpin"
                                                    >
                                                        <UnpinIcon size={14} />
                                                    </button>
                                                </div>
                                                <div className="pinned-content">
                                                    <div className="pinned-author">
                                                        <img
                                                            src={msg.sender.avatarUrl || `https://ui-avatars.com/api/?name=${msg.sender.username}&background=random`}
                                                            alt={msg.sender.username}
                                                        />
                                                        <span>{msg.sender.displayName || msg.sender.username}</span>
                                                    </div>
                                                    <div className="pinned-text">{msg.content}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                        }
                        <div className="messages-container timeline-view">
                            <div className="timeline-rail"></div>
                            <div className="timeline-messages">
                                {messages.length === 0 ? (
                                    <div className="no-messages">
                                        <p>No messages yet. Start the conversation!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div
                                            key={msg.id}
                                            className="timeline-message-wrapper"
                                            ref={(el) => {
                                                if (el && msg.sender.id !== user?.id && !msg.readAt) {
                                                    const observer = new IntersectionObserver(
                                                        (entries) => {
                                                            entries.forEach(entry => {
                                                                if (entry.isIntersecting) {
                                                                    markMessageRead(msg.id).catch(console.error);
                                                                    observer.disconnect();
                                                                }
                                                            });
                                                        },
                                                        { threshold: 0.5 }
                                                    );
                                                    observer.observe(el);
                                                }
                                            }}
                                        >
                                            {/* Time marker on timeline */}
                                            {shouldShowTimeMarker(msg, index) && (
                                                <div className="timeline-time-marker">
                                                    <span className="timeline-time">{formatTime(msg.createdAt)}</span>
                                                </div>
                                            )}
                                            <div
                                                id={`msg-${msg.id}`}
                                                className={`message ${msg.sender.id === user?.id ? 'own' : ''} ${hoveredMsgId === msg.id || longPressedMsgId === msg.id ? 'hovered' : ''}`}
                                                onMouseEnter={() => handleMsgMouseEnter(msg.id)}
                                                onMouseLeave={handleMsgMouseLeave}
                                                onTouchStart={() => handleMsgTouchStart(msg.id)}
                                                onTouchEnd={handleMsgTouchEnd}
                                            >
                                                {/* Exact timestamp on far right */}
                                                <span className="exact-timestamp">{formatExactTime(msg.createdAt)}</span>
                                                <div className="avatar">
                                                    {msg.sender.avatarUrl ? (
                                                        <img src={msg.sender.avatarUrl} alt="avatar" />
                                                    ) : (
                                                        <div className="avatar-placeholder">{msg.sender.username[0]}</div>
                                                    )}
                                                </div>
                                                <div className="message-body">
                                                    {/* Reply context - Discord style */}
                                                    {msg.replyToMessage && (
                                                        <div className="reply-context" onClick={() => {
                                                            const el = document.getElementById(`msg-${msg.replyToMessage?.id}`);
                                                            if (el) {
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                // Add highlight animation
                                                                el.classList.add('highlighted');
                                                                setTimeout(() => el.classList.remove('highlighted'), 2000);
                                                            }
                                                        }}>
                                                            <span className="reply-line"></span>
                                                            <span className="reply-author">@{msg.replyToMessage.sender.displayName || msg.replyToMessage.sender.username}</span>
                                                            <span className="reply-preview">{msg.replyToMessage.content}</span>
                                                        </div>
                                                    )}
                                                    <div className="message-header">
                                                        <span className="sender">{msg.sender.displayName || msg.sender.username}</span>
                                                        <span className="time">
                                                            {formatTime(msg.createdAt)}
                                                            {/* Read Receipt Indicator */}
                                                            {msg.sender.id === user?.id && !msg.deleted_at && (
                                                                <span className="read-status" title={msg.readAt ? "Read" : "Sent"}>
                                                                    {msg.readAt ?
                                                                        <span style={{ color: '#4da6ff', marginLeft: '4px' }}>✓✓</span> :
                                                                        <span style={{ color: '#666', marginLeft: '4px' }}>✓</span>
                                                                    }
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>

                                                    {msg.deleted_at ? (
                                                        <div className="message-content deleted">
                                                            <i>Message deleted</i>
                                                        </div>
                                                    ) : editingMessage?.id === msg.id ? (
                                                        <div className="edit-message-container">
                                                            <input
                                                                type="text"
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSaveEdit();
                                                                    if (e.key === 'Escape') handleCancelEdit();
                                                                }}
                                                                autoFocus
                                                            />
                                                            <div className="edit-actions">
                                                                <span className="edit-hint">enter to save • esc to cancel</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {renderMessageContent(msg)}
                                                            {msg.edited_at && <span className="edited-label">(edited)</span>}
                                                        </>
                                                    )}

                                                    {/* Reactions display */}
                                                    {msg.reactions && msg.reactions.length > 0 && (
                                                        <div className="reactions-row">
                                                            {groupReactions(msg.reactions).map(({ emoji, count, users }) => (
                                                                <button
                                                                    key={emoji}
                                                                    className="reaction-chip"
                                                                    title={users.join(', ')}
                                                                    onClick={() => handleReact(msg.id, emoji)}
                                                                >
                                                                    <span className="reaction-emoji">{emoji}</span>
                                                                    {count > 1 && <span className="reaction-count">{count}</span>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Hover/Long-press Actions */}
                                                <div className="message-actions">
                                                    {/* Single reaction button that opens picker */}
                                                    <button
                                                        onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                                                        title="Add Reaction"
                                                        className={`action-btn react-btn ${reactionPickerMsgId === msg.id ? 'active' : ''}`}
                                                    >
                                                        😊
                                                    </button>

                                                    {/* Reaction emoji picker for this message */}
                                                    {reactionPickerMsgId === msg.id && (
                                                        <EmojiPicker
                                                            onSelect={(emoji) => {
                                                                handleReact(msg.id, emoji);
                                                                setReactionPickerMsgId(null);
                                                            }}
                                                            onClose={() => setReactionPickerMsgId(null)}
                                                        />
                                                    )}

                                                    <button onClick={() => setReplyingTo(msg)} title="Reply" className="action-btn"><ReplyIcon size={16} /></button>

                                                    <button
                                                        onClick={() => msg.pinId ? handleUnpinMessage(msg.id) : handlePinMessage(msg.id)}
                                                        title={msg.pinId ? "Unpin" : "Pin"}
                                                        className={`action-btn ${msg.pinId ? "active" : ""}`}
                                                    >
                                                        {msg.pinId ? <UnpinIcon size={16} /> : <PinIcon size={16} />}
                                                    </button>

                                                    {/* Edit/Delete only for own messages */}
                                                    {msg.sender.id === user?.id && !msg.deleted_at && (
                                                        <>
                                                            <button onClick={() => handleEditMessage(msg)} title="Edit" className="action-btn"><EditIcon size={16} /></button>
                                                            <button onClick={() => handleDeleteMessage(msg.id)} title="Delete" className="action-btn"><TrashIcon size={16} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="message-input">
                            <div className="input-wrapper">
                                <div className="attach-wrapper">
                                    <button
                                        type="button"
                                        className="chat-action-btn"
                                        title="Upload file"
                                        onClick={() => setShowFileUpload(!showFileUpload)}
                                    >
                                        <AttachmentIcon size={20} />
                                    </button>
                                    {showFileUpload && (
                                        <FileUpload
                                            onFileSelect={handleFileSelect}
                                            onClose={() => setShowFileUpload(false)}
                                        />
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        // Debounced typing indicator emit
                                        if (selectedChat && e.target.value.trim()) {
                                            const now = Date.now();
                                            if (now - lastTypingEmit.current > 1000) {
                                                sendTyping(selectedChat.id);
                                                lastTypingEmit.current = now;
                                            }
                                        } else if (selectedChat && !e.target.value.trim()) {
                                            stopTyping(selectedChat.id);
                                        }
                                    }}
                                    placeholder={`Message ${selectedChat.type === 'channel' ? '#' + selectedChat.name : '...'}`}
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    className="chat-action-btn"
                                    title="Emojis"
                                    onClick={() => setShowEmojiPicker(true)}
                                >
                                    <EmojiIcon size={20} />
                                </button>
                                <button
                                    type="button"
                                    className="chat-action-btn"
                                    onClick={() => setShowGiphyPicker(true)}
                                    title="GIPHY"
                                >
                                    <GifIcon size={20} />
                                </button>
                                <button
                                    type="button"
                                    className="chat-action-btn"
                                    onClick={() => setShowKlipyPicker(true)}
                                    title="Klipy"
                                >
                                    <KlipyIcon size={20} />
                                </button>
                                <VoiceRecorder onSend={handleVoiceSend} />
                                <button
                                    type="submit"
                                    className="chat-action-btn send-btn"
                                    disabled={!newMessage.trim()}
                                    title="Send"
                                >
                                    <SendIcon size={20} />
                                </button>
                            </div>
                        </form>

                        {/* Reply bar above input */}
                        {
                            replyingTo && (
                                <div className="reply-bar">
                                    <div className="reply-bar-content">
                                        <span className="reply-bar-line"></span>
                                        <span className="reply-bar-text">
                                            Replying to <strong>@{replyingTo.sender.displayName || replyingTo.sender.username}</strong>
                                        </span>
                                        <span className="reply-bar-preview">{replyingTo.content.slice(0, 50)}{replyingTo.content.length > 50 ? '...' : ''}</span>
                                    </div>
                                    <button className="reply-bar-close" onClick={() => setReplyingTo(null)}>✕</button>
                                </div>
                            )
                        }

                        {/* Typing indicator - below input like Discord/Instagram */}
                        {
                            typingUsers.size > 0 && (
                                <div className="typing-indicator">
                                    <span className="typing-dots">●●●</span>
                                    <span className="typing-text">
                                        {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                                    </span>
                                </div>
                            )
                        }
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <div className="welcome-card">
                            <div className="welcome-icon">💎</div>
                            <h2>Welcome to The Penthouse</h2>
                            <p>Exclusive. Private. Yours.</p>
                            <p className="welcome-hint">Select a channel to begin.</p>
                        </div>
                    </div>
                )}
            </main >

            {/* 4. Member List (Right Sidebar) */}
            {
                selectedChat && (
                    <aside className={`members-sidebar ${membersCollapsed ? 'collapsed' : ''}`}>
                        <div className="members-header">
                            <h3>MEMBERS — {displayMembers.length}</h3>
                        </div>
                        <div className="members-list">
                            {displayMembers.map((u) => (
                                <div key={u.id} className="member-item">
                                    <div className="member-avatar">
                                        {u.avatarUrl ? (
                                            <img src={u.avatarUrl} alt="avatar" />
                                        ) : (
                                            u.username[0].toUpperCase()
                                        )}
                                        <div className="member-status-dot online"></div>
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">{u.displayName || u.username}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                )
            }

            {/* Modals */}
            {
                showGiphyPicker && (
                    <GifPicker
                        onSelect={handleGifSelect}
                        onClose={() => setShowGiphyPicker(false)}
                    />
                )
            }

            {
                showKlipyPicker && (
                    <KlipyPicker
                        onSelect={handleGifSelect}
                        onClose={() => setShowKlipyPicker(false)}
                    />
                )
            }

            {
                showEmojiPicker && (
                    <EmojiPicker
                        onSelect={handleEmojiSelect}
                        onClose={() => setShowEmojiPicker(false)}
                    />
                )
            }

            {
                showProfileModal && (
                    <ProfileModal onClose={() => setShowProfileModal(false)} />
                )
            }

            {
                lightboxImage && (
                    <ImageLightbox
                        src={lightboxImage.src}
                        alt={lightboxImage.alt}
                        onClose={() => setLightboxImage(null)}
                    />
                )
            }

            {
                previewFile && (
                    <FilePreview
                        fileUrl={previewFile.url}
                        fileName={previewFile.name}
                        fileType={previewFile.type}
                        onClose={() => setPreviewFile(null)}
                    />
                )
            }
            {
                showInviteModal && selectedServerId && (
                    <InviteModal
                        serverId={selectedServerId}
                        onClose={() => setShowInviteModal(false)}
                    />
                )
            }


            <ConfirmModal
                isOpen={messageToDelete !== null}
                onClose={() => setMessageToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Message"
                message="Are you sure you want to delete this message? This action cannot be undone."
                confirmText="Delete"
            />
        </div>
    );
}
