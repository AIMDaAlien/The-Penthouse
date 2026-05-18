export function shouldNotifyForScope(scope: string, chatType: 'dm' | 'group' | 'channel') {
  if (scope === 'off') return false;
  if (scope === 'dm_only') return chatType === 'dm';
  return true;
}
