import { useState, useEffect, useRef } from 'react';
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
import './Chat.css';

export default function ChatPage() {
    const { user, logout } = useAuth();

    // Global State
    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<number | null>(null); // null = Home (DMs)

    // Chat/Channel State
    const [chats, setChats] = useState<Chat[]>([]); // DMs and Groups
    const [serverChannels, setServerChannels] = useState<Channel[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

    // Messages State
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // UI State
    const [users, setUsers] = useState<User[]>([]);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [showNewServer, setShowNewServer] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [inputName, setInputName] = useState(''); // reused for Create Group/Server/Channel

    useEffect(() => {
        loadServers();
        loadChats(); // Always load DMs in background or on Home select
        loadUsers();

        const socket = getSocket();
        if (socket) {
            socket.on('new_message', (message: Message & { chatId: number }) => {
                if (selectedChat?.id === message.chatId) {
                    setMessages((prev) => [...prev, message]);
                }
                // If it's a DM, refresh chat list to show unread/latest
                if (!message.metadata?.serverId) { // Assuming we track this eventually
                    loadChats();
                }
            });
        }

        return () => {
            socket?.off('new_message');
        };
    }, [selectedChat]);

    useEffect(() => {
        if (selectedServerId) {
            loadServerDetails(selectedServerId);
        }
    }, [selectedServerId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadServers = async () => {
        try {
            const { data } = await getServers();
            setServers(data);
        } catch (err) {
            console.error('Failed to load servers:', err);
        }
    };

    const loadServerDetails = async (serverId: number) => {
        try {
            const { data } = await getServerDetails(serverId);
            setServerChannels(data.channels);
            // Could also setServerMembers here if we want to show them
        } catch (err) {
            console.error('Failed to load server details:', err);
        }
    };

    const loadChats = async () => {
        try {
            const { data } = await getChats();
            setChats(data);
        } catch (err) {
            console.error('Failed to load chats:', err);
        }
    };

    const loadUsers = async () => {
        try {
            const { data } = await searchUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };

    const handleServerSelect = (serverId: number | null) => {
        setSelectedServerId(serverId);
        setSelectedChat(null); // Deselect chat when switching contexts
    };

    const selectChat = async (chat: Chat) => {
        if (selectedChat) {
            leaveChat(selectedChat.id);
        }

        // Ensure type consistency
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
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>{selectedServerId ? servers.find(s => s.id === selectedServerId)?.name : 'The Penthouse'}</h2>
                    {selectedServerId === null && (
                        <div className="user-info">
                            <span>{user?.displayName || user?.username}</span>
                            <button onClick={logout} className="logout-btn">Logout</button>
                        </div>
                    )}
                </div>

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

                {/* Creation Form Modal/Inline */}
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
                        // DM List
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
                        // Server Channel List
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
                            <div className="header-title">
                                <span className="header-icon">
                                    {selectedChat.type === 'channel' ? '#' : selectedChat.isGroup ? '👥' : '👤'}
                                </span>
                                <h3>{selectedChat.name || 'Direct Message'}</h3>
                            </div>
                            <div className="header-actions">
                                {/* Search, Pin, etc icons could go here */}
                            </div>
                        </div>

                        <div className="messages-container">
                            {messages.map((msg) => (
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
                                        <div className="message-content">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="message-input">
                            <div className="input-wrapper">
                                <button type="button" className="attach-btn">+</button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Message ${selectedChat.type === 'channel' ? '#' + selectedChat.name : '...'} `}
                                    autoComplete="off"
                                />
                                <button type="button" className="emoji-btn">😊</button>
                                <button type="button" className="gif-btn">GIF</button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <div className="feature-showcase">
                            <h2>Welcome to The Penthouse</h2>
                            <p>Select a server or chat to begin.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* 4. Member List (Right Sidebar) - Only if chat selected */}
            {selectedChat && (
                <aside className="members-sidebar">
                    <h3>MEMBERS</h3>
                    {/* Assuming we fetch members for the current context. 
                        For DMs, it's just the participants. 
                        For Servers, it's server members. 
                        Currently using global users list as placeholder/search 
                    */}
                    {users.map((u) => (
                        <div key={u.id} className="member-item">
                            <div className="member-avatar">
                                {u.username[0].toUpperCase()}
                            </div>
                            <div className="member-info">
                                <span className="member-name">{u.displayName || u.username}</span>
                                <span className="member-status">Online</span>
                            </div>
                        </div>
                    ))}
                </aside>
            )}
        </div>
    );
}
