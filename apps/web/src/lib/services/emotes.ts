import { api } from './api';
import type { Emote, ListEmotesResponse } from '@penthouse/contracts';

export const emotes = {
  list(): Promise<ListEmotesResponse> {
    return api.get<ListEmotesResponse>('/api/v1/emotes');
  },
  create(data: { name: string; mediaUploadId: string }): Promise<{ emote: Emote }> {
    return api.post<{ emote: Emote }>('/api/v1/emotes', data);
  },
  remove(id: string): Promise<void> {
    return api.delete<void>(`/api/v1/emotes/${id}`);
  }
};
