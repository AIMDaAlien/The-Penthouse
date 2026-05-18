import { api } from './api';
import type {
	Message,
	SendMessageRequest,
	SendMessageResponse,
	EditMessageRequest,
	EditMessageResponse,
	DeleteMessageResponse,
	MarkChatReadRequest,
	MarkChatReadResponse,
	Channel,
	ChatSummary,
	ChatPreferencesRequest,
	ChatPreferencesResponse,
	CreateDirectChatRequest,
	CreateGroupChatRequest,
	UpdateChatRequest,
	AddChatMemberRequest,
	ArchiveChatResponse,
	DeleteChatResponse,
	ListChatMembersResponse,
	PinMessageRequest,
	PinResponse,
	ListPinsResponse
} from '@penthouse/contracts';

export const chats = {
	list(): Promise<{ chats: ChatSummary[] }> {
		return api.get<{ chats: ChatSummary[] }>('/api/v1/chats');
	},

	messages(chatId: string, { before }: { before?: string } = {}): Promise<{ messages: Message[] }> {
		const qs = before ? `?before=${before}` : '';
		return api.get<{ messages: Message[] }>(`/api/v1/chats/${chatId}/messages${qs}`);
	},
	searchMessages(chatId: string, query: string): Promise<{ messages: Message[] }> {
		return api.get<{ messages: Message[] }>(`/api/v1/chats/${chatId}/messages/search?q=${encodeURIComponent(query)}`);
	},

	sendMessage(chatId: string, data: SendMessageRequest): Promise<SendMessageResponse> {
		return api.post<SendMessageResponse>(`/api/v1/chats/${chatId}/messages`, data);
	},

	editMessage(messageId: string, data: EditMessageRequest): Promise<EditMessageResponse> {
		return api.patch<EditMessageResponse>(`/api/v1/messages/${messageId}`, data);
	},

	deleteMessage(messageId: string): Promise<DeleteMessageResponse> {
		return api.delete<DeleteMessageResponse>(`/api/v1/messages/${messageId}`);
	},

	markRead(chatId: string, data?: MarkChatReadRequest): Promise<MarkChatReadResponse> {
		return api.post<MarkChatReadResponse>(`/api/v1/chats/${chatId}/read`, data ?? {});
	},

	updatePreferences(chatId: string, data: ChatPreferencesRequest): Promise<ChatPreferencesResponse> {
		return api.patch<ChatPreferencesResponse>(`/api/v1/chats/${chatId}/preferences`, data);
	},

	createDM(data: CreateDirectChatRequest): Promise<{ chatId: string }> {
		return api.post<{ chatId: string }>('/api/v1/chats/dm', data);
	},

	createGroup(data: CreateGroupChatRequest): Promise<{ chat: ChatSummary }> {
		return api.post<{ chat: ChatSummary }>('/api/v1/chats/group', data);
	},

	updateChat(chatId: string, data: UpdateChatRequest): Promise<{ chat?: ChatSummary; channel?: Channel }> {
		return api.patch<{ chat?: ChatSummary; channel?: Channel }>(`/api/v1/chats/${chatId}`, data);
	},

	deleteChat(chatId: string): Promise<DeleteChatResponse> {
		return api.delete<DeleteChatResponse>(`/api/v1/chats/${chatId}`);
	},

	archive(chatId: string): Promise<ArchiveChatResponse> {
		return api.post<ArchiveChatResponse>(`/api/v1/chats/${chatId}/archive`);
	},

	unarchive(chatId: string): Promise<ArchiveChatResponse> {
		return api.post<ArchiveChatResponse>(`/api/v1/chats/${chatId}/unarchive`);
	},

	addMember(chatId: string, data: AddChatMemberRequest): Promise<{ member: unknown }> {
		return api.post<{ member: unknown }>(`/api/v1/chats/${chatId}/members`, data);
	},

	removeMember(chatId: string, memberId: string): Promise<{ success: true }> {
		return api.delete<{ success: true }>(`/api/v1/chats/${chatId}/members/${memberId}`);
	},

	leave(chatId: string): Promise<{ success: true }> {
		return api.post<{ success: true }>(`/api/v1/chats/${chatId}/leave`);
	},

	pinMessage(chatId: string, data: PinMessageRequest): Promise<PinResponse> {
		return api.post<PinResponse>(`/api/v1/chats/${chatId}/pins`, data);
	},

	unpinMessage(chatId: string, messageId: string): Promise<void> {
		return api.delete<void>(`/api/v1/chats/${chatId}/pins/${messageId}`);
	},

	listPins(chatId: string): Promise<ListPinsResponse> {
		return api.get<ListPinsResponse>(`/api/v1/chats/${chatId}/pins`);
	},

	listMembers(chatId: string): Promise<ListChatMembersResponse> {
		return api.get(`/api/v1/chats/${chatId}/members`);
	}
};
