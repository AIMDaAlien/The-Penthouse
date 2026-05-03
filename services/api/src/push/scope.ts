import type { ChatNotificationOverrideScope, NotificationScopeDefault } from '@penthouse/contracts';
import { isInQuietHours } from './dnd.js';

export type WebPushScopeInput = {
  notificationsEnabled: boolean;
  scopeDefault: NotificationScopeDefault;
  overrideScope: ChatNotificationOverrideScope | null;
  dndOverride: boolean;
  notificationsMuted: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTz: string | null;
  isMention: boolean;
  isDm: boolean;
};

function scopeAllowsMessage(scope: NotificationScopeDefault | ChatNotificationOverrideScope, isDm: boolean, isMention: boolean): boolean {
  switch (scope) {
    case 'off':
      return false;
    case 'dm_only':
      return isDm;
    case 'mentions_only':
      return isMention;
    case 'dm_and_mention':
      return isDm || isMention;
    case 'all':
      return true;
  }
}

export function isMentionForUsername(content: string, username: string): boolean {
  const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9._-])@${escapedUsername}(?=$|[^a-z0-9._-])`, 'i').test(content);
}

export function shouldSendWebPush(input: WebPushScopeInput, now = new Date()): boolean {
  if (!input.notificationsEnabled) return false;

  const effectiveScope = input.overrideScope ?? input.scopeDefault;
  if (!scopeAllowsMessage(effectiveScope, input.isDm, input.isMention)) return false;

  if (input.notificationsMuted && !input.dndOverride) return false;

  if (
    !input.dndOverride &&
    isInQuietHours({
      quietHoursEnabled: input.quietHoursEnabled,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
      quietHoursTz: input.quietHoursTz
    }, now)
  ) {
    return false;
  }

  return true;
}
