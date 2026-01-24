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
    addReaction
} from '../services/api';
import { getSocket, joinChat, leaveChat, sendTyping, stopTyping } from '../services/socket';
import type { Chat, Message, User, Server, Channel } from '../types';
import GifPicker from '../components/GifPicker';
import KlipyPicker from '../components/KlipyPicker';
import EmojiPicker from '../components/EmojiPicker';
import FileUpload from '../components/FileUpload';
import ProfileModal from '../components/ProfileModal';
import ImageLightbox from '../components/ImageLightbox';
import FilePreview from '../components/FilePreview';
import './Chat.css';

// Random emoji pool for quick reactions
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '🎉', '💯', '🙌', '👀', '✨', '💜', '🤔', '😍'];
const getRandomEmoji = () => REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];

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

    // Reply State
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    // Hover State for Random Emoji
    const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
    const [hoverEmoji, setHoverEmoji] = useState<string>('');

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
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [membersCollapsed, setMembersCollapsed] = useState(false);

    // Lightbox and File Preview state
    const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);

    // Typing indicator state
    const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
    const typingTimeouts = useRef<Map<number, number>>(new Map());
    const lastTypingEmit = useRef<number>(0);

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

        try {
            const { data } = await getMessages(completeChat.id);
            setMessages(data);
        } catch (err) {
            console.error('Failed to load messages:', err);
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

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        return <div className="message-content">{msg.content}</div>;
    };

    // Reaction handler
    const handleReact = async (messageId: number, emoji: string) => {
        try {
            await addReaction(messageId, emoji);
            // Optimistic update - socket will sync actual state
            setMessages(prev => prev.map(m => {
                if (m.id === messageId) {
                    const existingReactions = m.reactions || [];
                    const hasReacted = existingReactions.some(r => r.emoji === emoji && r.userId === user?.id);
                    if (!hasReacted) {
                        return {
                            ...m,
                            reactions: [...existingReactions, { emoji, userId: user!.id, username: user!.username, displayName: user?.displayName }]
                        };
                    }
                }
                return m;
            }));
        } catch (err) {
            console.error('Failed to add reaction:', err);
        }
    };

    // Reply handler
    const handleReply = (msg: Message) => {
        setReplyingTo(msg);
        // Focus input
        document.querySelector<HTMLInputElement>('.input-wrapper input')?.focus();
    };

    // Message hover handlers
    const handleMsgMouseEnter = (msgId: number) => {
        setHoveredMsgId(msgId);
        setHoverEmoji(getRandomEmoji());
    };

    const handleMsgMouseLeave = () => {
        setHoveredMsgId(null);
    };

    // Long-press handlers for mobile
    const handleMsgTouchStart = (msgId: number) => {
        longPressTimer.current = setTimeout(() => {
            setLongPressedMsgId(msgId);
            setHoverEmoji(getRandomEmoji());
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
                        <button onClick={() => { setShowNewGroup(true); setShowNewServer(false); }} className="action-btn">
                            New Group
                        </button>
                    ) : (
                        <button onClick={() => { setShowNewChannel(true); setShowNewServer(false); }} className="action-btn">
                            Create Channel
                        </button>
                    )}
                </div>

                {(showNewGroup || showNewServer || showNewChannel) && (
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
                                <div className="header-title">
                                    <h3>{selectedChat.name || 'Direct Message'}</h3>
                                </div>
                                {/* Hidden Toggle for Desktop Hover */}
                                <button
                                    className="toggle-sidebar-btn"
                                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                    title="Toggle Sidebar"
                                >
                                    ☰
                                </button>
                            </div>
                            <div className="header-actions">
                                <button
                                    className={`toggle-sidebar-btn ${!membersCollapsed ? 'active' : ''}`}
                                    onClick={() => setMembersCollapsed(!membersCollapsed)}
                                    title="Toggle Members"
                                >
                                    👥
                                </button>
                            </div>
                        </div>

                        <div className="messages-container timeline-view">
                            <div className="timeline-rail"></div>
                            <div className="timeline-messages">
                                {messages.length === 0 ? (
                                    <div className="no-messages">
                                        <p>No messages yet. Start the conversation!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div key={msg.id} className="timeline-message-wrapper">
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
                                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        }}>
                                                            <span className="reply-line"></span>
                                                            <span className="reply-author">@{msg.replyToMessage.sender.displayName || msg.replyToMessage.sender.username}</span>
                                                            <span className="reply-preview">{msg.replyToMessage.content}</span>
                                                        </div>
                                                    )}
                                                    <div className="message-header">
                                                        <span className="sender">{msg.sender.displayName || msg.sender.username}</span>
                                                        <span className="time">{formatTime(msg.createdAt)}</span>
                                                    </div>
                                                    {renderMessageContent(msg)}

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
                                                    <button
                                                        className="action-btn react-btn"
                                                        onClick={() => handleReact(msg.id, hoverEmoji || '❤️')}
                                                        title="React"
                                                    >
                                                        {hoverEmoji || '❤️'}
                                                    </button>
                                                    <button
                                                        className="action-btn reply-btn"
                                                        onClick={() => handleReply(msg)}
                                                        title="Reply"
                                                    >
                                                        ↩
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div ref={messagesEndRef} />

                            {/* Typing indicator */}
                            {typingUsers.size > 0 && (
                                <div className="typing-indicator">
                                    <span className="typing-dots">●●●</span>
                                    <span className="typing-text">
                                        {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                                    </span>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSend} className="message-input">
                            <div className="input-wrapper">
                                <div className="attach-wrapper">
                                    <button
                                        type="button"
                                        className="attach-btn"
                                        title="Upload file"
                                        onClick={() => setShowFileUpload(!showFileUpload)}
                                    >
                                        +
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
                                    className="emoji-btn"
                                    title="Emojis"
                                    onClick={() => setShowEmojiPicker(true)}
                                >
                                    😊
                                </button>
                                <button
                                    type="button"
                                    className="gif-btn giphy"
                                    onClick={() => setShowGiphyPicker(true)}
                                    title="GIPHY"
                                >
                                    GIPHY
                                </button>
                                <button
                                    type="button"
                                    className="gif-btn klipy"
                                    onClick={() => setShowKlipyPicker(true)}
                                    title="Klipy"
                                >
                                    KLIPY
                                </button>
                            </div>
                        </form>

                        {/* Reply bar above input */}
                        {replyingTo && (
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
                        )}
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
            </main>

            {/* 4. Member List (Right Sidebar) */}
            {selectedChat && (
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
            )}

            {/* Modals */}
            {showGiphyPicker && (
                <GifPicker
                    onSelect={handleGifSelect}
                    onClose={() => setShowGiphyPicker(false)}
                />
            )}

            {showKlipyPicker && (
                <KlipyPicker
                    onSelect={handleGifSelect}
                    onClose={() => setShowKlipyPicker(false)}
                />
            )}

            {showEmojiPicker && (
                <EmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                />
            )}

            {showProfileModal && (
                <ProfileModal onClose={() => setShowProfileModal(false)} />
            )}

            {lightboxImage && (
                <ImageLightbox
                    src={lightboxImage.src}
                    alt={lightboxImage.alt}
                    onClose={() => setLightboxImage(null)}
                />
            )}

            {previewFile && (
                <FilePreview
                    fileUrl={previewFile.url}
                    fileName={previewFile.name}
                    fileType={previewFile.type}
                    onClose={() => setPreviewFile(null)}
                />
            )}
        </div>
    );
}
