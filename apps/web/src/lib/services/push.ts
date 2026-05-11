import { api } from './api';
import type {
	NotificationPrefs,
	PatchNotificationPrefsRequest,
	ChatNotificationOverride,
	PatchChatNotificationOverrideRequest
} from '@penthouse/contracts';

export const pushService = {
	getPreferences(): Promise<NotificationPrefs> {
		return api.get<NotificationPrefs>('/api/v1/notifications/preferences');
	},

	updatePreferences(data: PatchNotificationPrefsRequest): Promise<NotificationPrefs> {
		return api.patch<NotificationPrefs>('/api/v1/notifications/preferences', data);
	},

	getChatOverride(chatId: string): Promise<ChatNotificationOverride> {
		return api.get<ChatNotificationOverride>(`/api/v1/notifications/overrides/${chatId}`);
	},

	updateChatOverride(chatId: string, data: PatchChatNotificationOverrideRequest): Promise<ChatNotificationOverride> {
		return api.patch<ChatNotificationOverride>(`/api/v1/notifications/overrides/${chatId}`, data);
	}
};
