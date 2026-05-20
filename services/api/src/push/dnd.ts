export { isInsideQuietHours } from './send.js';

type QuietHoursInput = {
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTz: string | null;
};

function minutesForDate(date: Date, timeZone: string): number | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '');
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

function parseTime(value: string): number | null {
  const [hour, minute] = value.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

export function isInQuietHours(input: QuietHoursInput, at = new Date()) {
  if (!input.quietHoursEnabled || !input.quietHoursStart || !input.quietHoursEnd || !input.quietHoursTz) {
    return false;
  }

  const current = minutesForDate(at, input.quietHoursTz);
  const start = parseTime(input.quietHoursStart);
  const end = parseTime(input.quietHoursEnd);
  if (current === null || start === null || end === null) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}
