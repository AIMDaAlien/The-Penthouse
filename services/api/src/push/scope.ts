import { isInQuietHours } from './dnd.js';

export function shouldNotifyForScope(scope: string, chatType: 'dm' | 'group' | 'channel') {
  if (scope === 'off') return false;
  if (scope === 'dm_only') return chatType === 'dm';
  return true;
}

type ShouldSendWebPushInput = {
  notificationsEnabled: boolean;
  scopeDefault: string;
  overrideScope: string | null;
  dndOverride: boolean;
  notificationsMuted: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTz: string | null;
  isMention: boolean;
  isDm: boolean;
};

export function isMentionForUsername(content: string, username: string) {
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s)@${escaped}(?=$|\\s|[.,!?;:])`, 'i').test(content);
}

export function shouldSendWebPush(input: ShouldSendWebPushInput, at = new Date()) {
  if (!input.notificationsEnabled) return false;
  if (input.notificationsMuted && !input.dndOverride) return false;

  const scope = input.overrideScope ?? input.scopeDefault;
  if (scope === 'off') return false;
  if (scope === 'dm_only' && !input.isDm) return false;
  if (scope === 'dm_and_mention' && !input.isDm && !input.isMention) return false;
  if (scope === 'mentions_only' && !input.isMention) return false;

  if (input.quietHoursEnabled && !input.dndOverride) {
    if (isInQuietHours(input, at)) return false;
  }

  return true;
}
