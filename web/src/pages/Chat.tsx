import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    searchUsers,
} from '../services/api';

import type { Chat, User } from '../types';
import { useMobileGestures } from '../hooks/useMobileGestures';
import { useServers } from '../hooks/useServers';
import { useChats } from '../hooks/useChats';
import { useMessages } from '../hooks/useMessages';
import MessageInput from '../components/MessageInput';
import MessageList from '../components/MessageList';
import ServerSidebar from '../components/ServerSidebar';
import MembersSidebar from '../components/MembersSidebar';
import { PinIcon, UnpinIcon, UsersIcon } from '../components/Icons';
import ProfileModal from '../components/ProfileModal';
import InviteModal from '../components/InviteModal';
import ConfirmModal from '../components/ConfirmModal';
// MessageInput component is available at ../components/MessageInput.tsx for future refactoring
import './Chat.css';




export default function ChatPage() {
    const { user, logout } = useAuth();

    // Server state (from hook)
    const {
        servers,
        selectedServerId,
        serverChannels,
        serverMembers,
        showNewServer,
        showNewChannel,
        showJoinServer,
        joinCode,
        loadServers,
        loadServerDetails,
        handleServerSelect: baseHandleServerSelect,
        setShowNewServer,
        setShowNewChannel,
        setShowJoinServer,
        setJoinCode,
        handleCreateServer,
        handleCreateChannel,
        handleJoinServer,
    } = useServers();

    // Chat/Channel State (extracted to hook)
    const {
        chats,
        selectedChat,
        setSelectedChat,
        loadChats,
        selectChat: updateChatSelection,
        createNewGroup,
    } = useChats(user);

    // Messages Hook (handles messages, typing, edit, pin, react)
    const {
        messages,
        editingMessage, editContent, setEditContent,
        pinnedMessages,
        typingUsers,
        replyingTo, setReplyingTo,
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
        messagesEndRef,
    } = useMessages(selectedChat, user, loadChats);

    const [showPins, setShowPins] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Helpers
    const getChatName = (chat: Chat) => {
        if (chat.name) return chat.name;
        if (chat.type === 'dm') {
            const otherUser = chat.participants?.find(p => p.id !== user?.id);
            return otherUser ? (otherUser.displayName || otherUser.username) : 'Note to Self';
        }
        return 'Untitled Chat';
    };

    // UI State
    const [users, setUsers] = useState<User[]>([]);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [inputName, setInputName] = useState('');
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Mobile responsiveness (from hook)
    const {
        isMobile,
        sidebarCollapsed,
        membersCollapsed,
        setSidebarCollapsed,
        setMembersCollapsed,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    } = useMobileGestures();




    const loadUsers = useCallback(async () => {
        try {
            const { data } = await searchUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            loadServers();
            loadChats();
            loadUsers();
        };
        init();
        // Socket message handling is now in useMessages hook
    }, [loadServers, loadChats, loadUsers]);

    useEffect(() => {
        if (selectedServerId) {
            loadServerDetails(selectedServerId);
        }
    }, [selectedServerId, loadServerDetails]);


    // Wrapper for handleServerSelect that also clears selectedChat
    const handleServerSelect = (serverId: number | null) => {
        baseHandleServerSelect(serverId);
        setSelectedChat(null);
    };

    const selectChat = async (chat: Chat) => {
        // Validation/type check handled in hook
        updateChatSelection(chat);

        // Auto-collapse sidebar on mobile after selecting a chat
        if (isMobile) {
            setSidebarCollapsed(true);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        try {
            if (showNewServer) {
                await handleCreateServer(inputName);
            } else if (showNewGroup) {
                await createNewGroup(inputName.trim());
                setShowNewGroup(false);
            } else if (showNewChannel && selectedServerId) {
                await handleCreateChannel(inputName);
            }
            setInputName('');
        } catch (err) {
            console.error('Creation failed:', err);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;

        const result = await handleJoinServer(joinCode);
        if (result.success && result.serverId) {
            handleServerSelect(result.serverId);
        }
    };

    const displayMembers = selectedServerId ? serverMembers : users;


    return (
        <div
            className="app-container"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* 1. Server Rail */}
            <ServerSidebar
                servers={servers}
                selectedServerId={selectedServerId}
                onSelectServer={handleServerSelect}
                onCreateServer={() => { setShowNewServer(true); setShowNewGroup(false); setShowNewChannel(false); }}
            />

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
                                        if (!showPins && selectedChat) {
                                            loadPinnedMessages(selectedChat.id);
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
                        <MessageList
                            messages={messages}
                            currentUser={user}
                            messagesEndRef={messagesEndRef}
                            editingMessage={editingMessage}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            onReply={setReplyingTo}
                            onEdit={handleEditMessage}
                            onDelete={handleDeleteMessage}
                            onPin={handlePinMessage}
                            onUnpin={handleUnpinMessage}
                            onReact={handleReact}
                        />

                        <MessageInput
                            selectedChat={selectedChat}
                            onSendMessage={sendMessage}
                            onFileUpload={handleFileSelect}
                            onVoiceSend={handleVoiceSend}
                            replyingTo={replyingTo}
                            onCancelReply={() => setReplyingTo(null)}
                        />

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
                    <MembersSidebar
                        members={displayMembers}
                        collapsed={membersCollapsed}
                    />
                )
            }

            {/* Modals */}
            {
                showProfileModal && (
                    <ProfileModal onClose={() => setShowProfileModal(false)} />
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


            {
                (showNewGroup || showNewServer || showNewChannel || showJoinServer) && (
                    <div className="creation-form-container" onClick={() => {
                        setShowNewGroup(false);
                        setShowNewServer(false);
                        setShowNewChannel(false);
                        setShowJoinServer(false);
                    }}>
                        <div className="creation-form-modal" onClick={e => e.stopPropagation()}>
                            <h3>
                                {showNewServer ? "Create Server" :
                                    showNewGroup ? "Create Group" :
                                        showJoinServer ? "Join Server" : "Create Channel"}
                            </h3>
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
                    </div>
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
