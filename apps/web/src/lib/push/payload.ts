/** Parse Web Push payload with privacy-level-aware fields */

export type PushPrivacyLevel = 'private' | 'metadata' | 'full';

export interface PushPayload {
	privacyLevel: PushPrivacyLevel;
	chatId?: string;
	chatName?: string;
	chatType?: 'dm' | 'group';
	messageId?: string;
	senderId?: string;
	senderName?: string;
	senderAvatar?: string;
	body?: string;
	mediaType?: 'image' | 'video' | 'audio' | 'gif' | 'file';
	scope?: 'dm_only' | 'all';
	badge?: number;
}

export function parsePushPayload(raw: unknown): PushPayload {
	if (!raw || typeof raw !== 'object') {
		return { privacyLevel: 'private' };
	}
	const p = raw as Record<string, unknown>;

	const level = (p.privacyLevel as PushPrivacyLevel) ?? 'private';
	if (!['private', 'metadata', 'full'].includes(level)) {
		return { privacyLevel: 'private' };
	}

	return {
		privacyLevel: level,
		chatId: typeof p.chatId === 'string' ? p.chatId : undefined,
		chatName: typeof p.chatName === 'string' ? p.chatName : undefined,
		chatType: p.chatType === 'dm' || p.chatType === 'group' ? p.chatType : undefined,
		messageId: typeof p.messageId === 'string' ? p.messageId : undefined,
		senderId: typeof p.senderId === 'string' ? p.senderId : undefined,
		senderName: typeof p.senderName === 'string' ? p.senderName : undefined,
		senderAvatar: typeof p.senderAvatar === 'string' ? p.senderAvatar : undefined,
		body: typeof p.body === 'string' ? p.body : undefined,
		mediaType: p.mediaType === 'image' || p.mediaType === 'video' || p.mediaType === 'audio' || p.mediaType === 'gif' || p.mediaType === 'file'
			? p.mediaType
			: undefined,
		scope: p.scope === 'dm_only' || p.scope === 'all' ? p.scope : undefined,
		badge: typeof p.badge === 'number' ? p.badge : undefined,
	};
}

export function buildNotificationTitle(payload: PushPayload): string {
	if (payload.privacyLevel === 'private') {
		return 'The Penthouse';
	}
	const sender = payload.senderName ?? 'Someone';
	if (payload.chatType === 'group' && payload.chatName) {
		return `${sender} · ${payload.chatName}`;
	}
	return sender;
}

export function buildNotificationBody(payload: PushPayload): string {
	if (payload.privacyLevel === 'private') {
		return 'You have a new message';
	}
	if (payload.mediaType) {
		return payload.mediaType === 'gif' ? 'Sent a GIF' : `Sent ${payload.mediaType}`;
	}
	if (payload.privacyLevel === 'metadata') {
		return 'New message';
	}
	return payload.body?.slice(0, 180) ?? 'New message';
}

export function shouldSuppressPush(payload: PushPayload, currentChatId?: string | null): boolean {
	if (payload.scope === 'dm_only' && payload.chatType !== 'dm') {
		return true;
	}
	if (payload.chatId && currentChatId === payload.chatId) {
		return true;
	}
	return false;
}
