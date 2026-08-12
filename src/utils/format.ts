export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr);
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// String-level conversion (no Date round-trip) so the result never shifts a day
// across timezones — used for <time datetime> attributes.
export function toIsoDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const iso = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const d = parseDate(dateStr);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function daysSince(dateStr: string, now = Date.now()): number | null {
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeAge(dateStr: string, now = Date.now()): string {
  const days = daysSince(dateStr, now);
  if (days == null) return '';
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}
