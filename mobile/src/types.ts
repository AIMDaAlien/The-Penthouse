export interface User {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    email?: string;
}

export interface Server {
    id: number;
    name: string;
    iconUrl?: string;
    ownerId: number;
    memberCount?: number;
    unreadCount?: number;
}

export interface Channel {
    id: number;
    name: string;
    type: 'text' | 'voice' | 'dm' | 'group' | 'channel'; // Unified type
    serverId?: number;
    lastMessage?: string;
    unreadCount?: number;
    vibe?: 'chill' | 'hype' | 'serious' | 'default';
    activeUsers?: User[];
    allowedRoles?: string[]; // Array of Role IDs allowed to access
}

export interface Role {
    id: string;
    name: string; // e.g., 'Owner', 'VIP', 'Guest'
    color: string; // Hex color for name display
    permissions: Permission[];
}

export type Permission = 
    | 'MANAGE_CHANNELS'
    | 'MANAGE_ROLES'
    | 'KICK_MEMBERS'
    | 'BAN_MEMBERS'
    | 'SEND_MESSAGES'
    | 'View_LOCKED_CHANNELS';

export interface Chat {
    id: number;
    name: string | null;
    isGroup: boolean;
    type: 'dm' | 'group' | 'channel';
    serverId?: number;
    lastMessage?: string;
    participants?: User[];
    lastMessageAt?: string;
    memberCount: number;
    nickname?: string;
    unreadCount?: number;
}

export interface Reaction {
    emoji: string;
    userId: number;
    username: string;
    displayName?: string;
}

export interface ReplyContext {
    id: number;
    content: string;
    sender: {
        id: number;
        username: string;
        displayName?: string;
    };
}

export interface Message {
    id: number;
    chatId?: number; // Used by socket events
    content: string;
    type: string;
    metadata?: Record<string, unknown>;
    replyTo?: number | null;
    replyToMessage?: ReplyContext | null;
    reactions?: Reaction[];
    createdAt: string;
    edited_at?: string;
    editedAt?: string; // Alternative casing
    deleted_at?: string;
    deletedAt?: string; // Alternative casing
    readAt?: string;
    pinId?: number;
    pinnedAt?: string;
    pinnedBy?: string;
    isPinned?: boolean;
    nonce?: string; // For optimistic updates
    sender: {
        id: number;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
}
