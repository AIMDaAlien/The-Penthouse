export interface User {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export interface Server {
    id: number;
    name: string;
    iconUrl?: string;
    ownerId: number;
    memberCount?: number;
}

export interface Channel {
    id: number;
    name: string;
    type: 'text' | 'voice' | 'dm' | 'group' | 'channel'; // Unified type
    serverId?: number;
    lastMessage?: string;
}

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
    content: string;
    type: string;
    metadata?: Record<string, unknown>;
    replyTo?: number | null;
    replyToMessage?: ReplyContext | null;
    reactions?: Reaction[];
    createdAt: string;
    edited_at?: string;
    deleted_at?: string;
    readAt?: string;
    pinId?: number;
    pinnedAt?: string;
    pinnedBy?: string;
    sender: {
        id: number;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
}
