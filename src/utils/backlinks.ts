import { getCollection } from 'astro:content';
import { WIKILINK, resolveTarget, stripCode } from '../plugins/remark-wikilinks.mjs';
import { slugOf } from '../sections.mjs';
import type { Entry } from './entries';

export interface Backlink {
  id: string;
  title: string;
  description?: string;
}

/**
 * Which entries link *to* each entry.
 *
 * The id space is built from the collection rather than the filesystem so
 * drafts are excluded consistently — a draft linking to a published note
 * shouldn't advertise itself on that note's page.
 */
export async function buildBacklinks(): Promise<Map<string, Backlink[]>> {
  const entries = await getCollection('garden', ({ data }) => !data.draft);

  const ids = new Set(entries.map(e => e.id));
  const bySlug = new Map<string, string[]>();
  for (const entry of entries) {
    const slug = slugOf(entry.id);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(entry.id);
  }

  const backlinks = new Map<string, Backlink[]>();

  for (const entry of entries) {
    const body = stripCode(entry.body ?? '');
    const seen = new Set<string>();

    WIKILINK.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WIKILINK.exec(body)) !== null) {
      const { id: targetId } = resolveTarget(match[1], { ids, bySlug });
      // Unresolved links are the prebuild checker's problem, not this index's.
      if (!targetId || targetId === entry.id) continue;
      // Linking twice from one entry is still one backlink.
      if (seen.has(targetId)) continue;
      seen.add(targetId);

      if (!backlinks.has(targetId)) backlinks.set(targetId, []);
      backlinks.get(targetId)!.push({
        id: entry.id,
        title: entry.data.title,
        description: entry.data.description,
      });
    }
  }

  return backlinks;
}

/** Convenience for a single page; callers rendering many pages should reuse the map. */
export async function backlinksFor(entry: Entry): Promise<Backlink[]> {
  const map = await buildBacklinks();
  return map.get(entry.id) ?? [];
}
