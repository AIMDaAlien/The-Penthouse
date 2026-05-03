type QuietHoursPrefs = {
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTz: string | null;
};

function timeToMinute(value: string | null): number | null {
  if (!value) return null;
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return hour * 60 + minute;
}

function currentMinuteForTimezone(timeZone: string, now: Date): number | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '');
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

export function isInQuietHours(prefs: QuietHoursPrefs, now = new Date()): boolean {
  if (!prefs.quietHoursEnabled) return false;
  if (!prefs.quietHoursTz) return false;

  const start = timeToMinute(prefs.quietHoursStart);
  const end = timeToMinute(prefs.quietHoursEnd);
  const current = currentMinuteForTimezone(prefs.quietHoursTz, now);
  if (start === null || end === null || current === null || start === end) return false;

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}
