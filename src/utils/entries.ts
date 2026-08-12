import type { CollectionEntry } from 'astro:content';

export type Entry = CollectionEntry<'garden'>;

interface DatedLike {
  data: { date: Date; updated?: Date };
}

/** Newest first by effective date (an update outranks the original publish). */
export function compareEntries(a: DatedLike, b: DatedLike): number {
  const aTime = (a.data.updated ?? a.data.date).getTime();
  const bTime = (b.data.updated ?? b.data.date).getTime();
  if (aTime !== bTime) return bTime - aTime;
  // Tiebreak: a freshly-updated entry ranks above a same-date original publish.
  if (a.data.updated && !b.data.updated) return -1;
  if (!a.data.updated && b.data.updated) return 1;
  return 0;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function readingTime(markdown: string): string {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

/** The date the entry should sort and display by, plus whether it was revised. */
export function dateParts(data: { date: Date; updated?: Date }) {
  const origDate = isoDate(data.date);
  const updatedDate = data.updated ? isoDate(data.updated) : null;
  return {
    effectiveDate: updatedDate ?? origDate,
    origDate,
    isUpdated: updatedDate !== null && updatedDate !== origDate,
  };
}
