import { api } from './api';
import type { SyncResponse } from '@penthouse/contracts';

export const syncApi = {
	pull(cursor = '0', limit = 100): Promise<SyncResponse> {
		return api.get<SyncResponse>(`/api/v1/sync?cursor=${encodeURIComponent(cursor)}&limit=${limit}`);
	}
};
