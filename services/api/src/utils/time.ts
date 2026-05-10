const unitMs: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000
};

export function durationToDate(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return new Date(Date.now() + 7 * unitMs.d);
  return new Date(Date.now() + Number(match[1]) * unitMs[match[2]]);
}

export function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
