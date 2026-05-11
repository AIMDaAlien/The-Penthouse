import { api } from './api';
import type {
	AuthResponse,
	LoginRequest,
	RegisterRequest,
	MeResponse,
	RefreshRequest,
	PasswordResetRequest,
	ChangePasswordRequest,
	UpdateProfileRequest
} from '@penthouse/contracts';

export const auth = {
	register(data: RegisterRequest): Promise<AuthResponse> {
		return api.post<AuthResponse>('/api/v1/auth/register', data);
	},

	login(data: LoginRequest): Promise<AuthResponse> {
		return api.post<AuthResponse>('/api/v1/auth/login', data);
	},

	refresh(data: RefreshRequest): Promise<AuthResponse> {
		return api.post<AuthResponse>('/api/v1/auth/refresh', data);
	},

	logout(): Promise<void> {
		return api.post<void>('/api/v1/auth/logout');
	},

	me(): Promise<MeResponse> {
		return api.get<MeResponse>('/api/v1/auth/me');
	},

	resetPassword(data: PasswordResetRequest): Promise<void> {
		return api.post<void>('/api/v1/auth/reset-password', data);
	},

	changePassword(data: ChangePasswordRequest): Promise<void> {
		return api.patch<void>('/api/v1/auth/password', data);
	},

	updateProfile(data: UpdateProfileRequest): Promise<MeResponse> {
		return api.patch<MeResponse>('/api/v1/auth/me', data);
	}
};
