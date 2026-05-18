import { api } from './api';
import type {
	Channel,
	CreateChannelRequest,
	ListChannelsResponse
} from '@penthouse/contracts';

export const channels = {
	list(parentChatId: string): Promise<ListChannelsResponse> {
		return api.get<ListChannelsResponse>(`/api/v1/chats/${parentChatId}/channels`);
	},

	create(parentChatId: string, data: CreateChannelRequest): Promise<{ channel: Channel }> {
		return api.post<{ channel: Channel }>(`/api/v1/chats/${parentChatId}/channels`, data);
	},

	delete(channelId: string): Promise<void> {
		return api.delete<void>('/api/v1/chats/' + channelId);
	},

	update(channelId: string, patch: { name?: string }): Promise<{ channel: Channel }> {
		return api.patch<{ channel: Channel }>('/api/v1/chats/' + channelId, patch);
	}
};
