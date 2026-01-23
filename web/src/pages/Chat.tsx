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
    createChannel
} from '../services/api';
import { getSocket, joinChat, leaveChat } from '../services/socket';
import type { Chat, Message, User, Server, Channel } from '../types';
import GifPicker from '../components/GifPicker';
import KlipyPicker from '../components/KlipyPicker';
import ProfileModal from '../components/ProfileModal';
import './Chat.css';

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

    // UI State
    const [users, setUsers] = useState<User[]>([]);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [showNewServer, setShowNewServer] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [inputName, setInputName] = useState('');
    const [showGiphyPicker, setShowGiphyPicker] = useState(false);
    const [showKlipyPicker, setShowKlipyPicker] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [membersCollapsed, setMembersCollapsed] = useState(false);

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
                }
                loadChats();
            });
        }

        return () => {
            socket?.off('new_message');
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
            await sendMessage(selectedChat.id, newMessage.trim());
            setNewMessage('');
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

    const isGifMessage = (msg: Message) => {
        return msg.type === 'gif' || msg.content?.match(/\.(gif|webp)$/i) || msg.content?.includes('giphy.com');
    };

    const renderMessageContent = (msg: Message) => {
        if (isGifMessage(msg)) {
            return (
                <div className="message-gif">
                    <img src={msg.content} alt="GIF" loading="lazy" />
                </div>
            );
        }
        return <div className="message-content">{msg.content}</div>;
    };

    const displayMembers = selectedServerId ? serverMembers : users;

    return (
        <div className="app-container">
            {/* 1. Server Rail */}
            <nav className="server-rail">
                <div
                    className={`server-icon home-icon ${selectedServerId === null ? 'active' : ''}`}
                    onClick={() => handleServerSelect(null)}
                    title="Home"
                >
                    🏠
                </div>

                <div className="server-separator"></div>

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
                    <button
                        className="collapse-btn"
                        onClick={() => setSidebarCollapsed(true)}
                        title="Collapse"
                    >
                        ◀
                    </button>
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
                                {sidebarCollapsed && (
                                    <button
                                        className="toggle-sidebar-btn"
                                        onClick={() => setSidebarCollapsed(false)}
                                        title="Show channels"
                                    >
                                        ☰
                                    </button>
                                )}
                                <div className="header-title">
                                    <span className="header-icon">
                                        {selectedChat.type === 'channel' ? '#' : selectedChat.isGroup ? '👥' : '👤'}
                                    </span>
                                    <h3>{selectedChat.name || 'Direct Message'}</h3>
                                </div>
                            </div>
                            <div className="header-actions">
                                <button
                                    className={`toggle-sidebar-btn ${!membersCollapsed ? 'active' : ''}`}
                                    onClick={() => setMembersCollapsed(!membersCollapsed)}
                                    title={membersCollapsed ? "Show members" : "Hide members"}
                                >
                                    👥
                                </button>
                            </div>
                        </div>

                        <div className="messages-container">
                            {messages.length === 0 ? (
                                <div className="no-messages">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`message ${msg.sender.id === user?.id ? 'own' : ''}`}
                                    >
                                        <div className="avatar">
                                            {msg.sender.avatarUrl ? (
                                                <img src={msg.sender.avatarUrl} alt="avatar" />
                                            ) : (
                                                <div className="avatar-placeholder">{msg.sender.username[0]}</div>
                                            )}
                                        </div>
                                        <div className="message-body">
                                            <div className="message-header">
                                                <span className="sender">{msg.sender.displayName || msg.sender.username}</span>
                                                <span className="time">{formatTime(msg.createdAt)}</span>
                                            </div>
                                            {renderMessageContent(msg)}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="message-input">
                            <div className="input-wrapper">
                                <button type="button" className="attach-btn" title="Attach file">+</button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Message ${selectedChat.type === 'channel' ? '#' + selectedChat.name : '...'}`}
                                    autoComplete="off"
                                />
                                <button type="button" className="emoji-btn" title="Emojis">😊</button>
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
                    </>
                ) : (
                    <div className="no-chat-selected">
                        {sidebarCollapsed && (
                            <button
                                className="toggle-sidebar-btn"
                                onClick={() => setSidebarCollapsed(false)}
                                style={{ position: 'absolute', top: 16, left: 16 }}
                            >
                                ☰
                            </button>
                        )}
                        <div className="welcome-card">
                            <div className="welcome-icon">🏠</div>
                            <h2>Welcome to The Penthouse</h2>
                            <p>Your exclusive private hangout space</p>
                            <div className="welcome-features">
                                <div className="feature">
                                    <span className="feature-icon">💬</span>
                                    <span>Group Chats</span>
                                </div>
                                <div className="feature">
                                    <span className="feature-icon">🎬</span>
                                    <span>GIF Support</span>
                                </div>
                                <div className="feature">
                                    <span className="feature-icon">🔒</span>
                                    <span>Private & Secure</span>
                                </div>
                            </div>
                            <p className="welcome-hint">Select a chat or create a new one to get started</p>
                        </div>
                    </div>
                )}
            </main>

            {/* 4. Member List (Right Sidebar) */}
            {selectedChat && (
                <aside className={`members-sidebar ${membersCollapsed ? 'collapsed' : ''}`}>
                    <div className="members-header">
                        <h3>MEMBERS — {displayMembers.length}</h3>
                        <button
                            className="collapse-btn"
                            onClick={() => setMembersCollapsed(true)}
                            title="Hide"
                        >
                            ▶
                        </button>
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

            {showProfileModal && (
                <ProfileModal onClose={() => setShowProfileModal(false)} />
            )}
        </div>
    );
}
