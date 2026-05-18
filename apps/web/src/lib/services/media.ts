import { api } from './api';
import type { UploadResponse } from '@penthouse/contracts';

export const media = {
	async upload(file: File, purpose?: 'avatar' | 'banner'): Promise<UploadResponse> {
		const formData = new FormData();
		formData.append('file', file);
		const query = purpose ? `?purpose=${purpose}` : '';
		return api.post<UploadResponse>(`/api/v1/media/upload${query}`, formData);
	}
};
