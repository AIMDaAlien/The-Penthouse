import { api } from './api';
import type { UploadResponse } from '@penthouse/contracts';

export const media = {
	async upload(file: File): Promise<UploadResponse> {
		const formData = new FormData();
		formData.append('file', file);
		return api.post<UploadResponse>('/api/v1/media/upload', formData);
	}
};
