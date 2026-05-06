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
	ChatSummary,
	ChatPreferencesRequest,
	ChatPreferencesResponse
} from '@penthouse/contracts';

export const chats = {
	list(): Promise<{ chats: ChatSummary[] }> {
		return api.get<{ chats: ChatSummary[] }>('/api/v1/chats');
	},

	messages(chatId: string, { before }: { before?: string } = {}): Promise<{ messages: Message[] }> {
		const qs = before ? `?before=${before}` : '';
		return api.get<{ messages: Message[] }>(`/api/v1/chats/${chatId}/messages${qs}`);
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
	}
};
