import { api } from './api';
import type {
	MemberDetail,
	UserSearchResponse,
	ListUsersResponse,
	UpdateProfileRequest,
	MeResponse
} from '@penthouse/contracts';

export const users = {
	search(query: string, limit = 50): Promise<UserSearchResponse> {
		return api.get<UserSearchResponse>(`/api/v1/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
	},

	list({ offset = 0, limit = 20 }: { offset?: number; limit?: number } = {}): Promise<ListUsersResponse> {
		return api.get<ListUsersResponse>(`/api/v1/users?offset=${offset}&limit=${limit}`);
	},

	updateProfile(data: UpdateProfileRequest): Promise<MeResponse> {
		return api.patch<MeResponse>('/api/v1/auth/me', data);
	}
};
