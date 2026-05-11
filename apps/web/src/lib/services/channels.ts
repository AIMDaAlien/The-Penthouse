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
	}
};
