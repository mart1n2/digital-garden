import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';
import { SECTIONS } from '../sections.mjs';

/**
 * Resolves Obsidian-style `[[target]]` and `[[target|display]]` links against
 * the garden collection.
 *
 * Targets may be written as a bare slug (`[[zerolend-liquidity-index]]`) or as
 * a fully-qualified id (`[[security/zerolend-liquidity-index]]`). Bare slugs
 * are the ergonomic form; they error if the same slug exists in two sections,
 * because silently picking one would be worse than asking for the prefix.
 *
 * A generic wikilink plugin can't do this: collection ids here are
 * section-prefixed, so resolution has to know the directory layout.
 *
 * NOTE: throwing here does *not* fail the build — Astro's glob loader catches
 * render errors, logs them, and exits 0. `scripts/check-wikilinks.mjs` runs the
 * same resolution as a prebuild gate and is what actually breaks CI.
 */

export const CONTENT_ROOT = path.resolve('src/content/garden');

export const WIKILINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

/**
 * Blank out frontmatter, fenced blocks, and inline code so a `[[example]]` in a
 * code sample isn't treated as a link.
 *
 * The remark plugin itself doesn't need this — it visits text nodes and never
 * enters code. It lives here so the consumers that scan raw markdown instead of
 * an AST (the prebuild checker and the backlink index) share one definition
 * with the plugin's notion of what counts as a link. Replacing with spaces
 * rather than removing keeps offsets stable for line reporting.
 */
export function stripCode(source) {
  return source
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, m => ' '.repeat(m.length))
    .replace(/```[\s\S]*?```/g, m => ' '.repeat(m.length))
    .replace(/`[^`\n]*`/g, m => ' '.repeat(m.length));
}

function readTitle(filePath, fallback) {
  // Cheap frontmatter scan rather than a YAML dependency — the title is always
  // a single scalar line, and a wrong read degrades to the slug.
  const head = fs.readFileSync(filePath, 'utf-8').slice(0, 2000);
  const frontmatter = head.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return fallback;
  const title = frontmatter[1].match(/^title:\s*(.+)$/m);
  if (!title) return fallback;
  return title[1].trim().replace(/^["']|["']$/g, '') || fallback;
}

/**
 * Read the id space fresh on every call. It's a handful of readdir calls at
 * this content volume, and caching would serve stale results to the dev server
 * when a note is added.
 */
export function collectIds() {
  const ids = new Set();
  const bySlug = new Map();
  const titles = new Map();

  for (const section of SECTIONS) {
    const dir = path.join(CONTENT_ROOT, section);
    if (!fs.existsSync(dir)) continue;

    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith('.md')) continue;
      const slug = entry.replace(/\.md$/, '');
      const id = `${section}/${slug}`;
      ids.add(id);
      titles.set(id, readTitle(path.join(dir, entry), slug));
      if (!bySlug.has(slug)) bySlug.set(slug, []);
      bySlug.get(slug).push(id);
    }
  }

  return { ids, bySlug, titles };
}

/** Returns `{ id }` on success or `{ error }` describing why it failed. */
export function resolveTarget(target, { ids, bySlug }) {
  const cleaned = target.trim().replace(/^\/+|\/+$/g, '');

  if (ids.has(cleaned)) return { id: cleaned };

  const matches = bySlug.get(cleaned);
  if (!matches || matches.length === 0) {
    return { error: `no entry matches "${cleaned}"` };
  }
  if (matches.length > 1) {
    return {
      error:
        `"${cleaned}" exists in multiple sections (${matches.join(', ')}) — ` +
        `qualify it, e.g. [[${matches[0]}]]`,
    };
  }
  return { id: matches[0] };
}

export function remarkWikilinks() {
  return (tree, file) => {
    const idSpace = collectIds();
    const sourcePath = file?.history?.[0] ?? file?.path ?? '<unknown>';

    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (!node.value.includes('[[')) return;

      const children = [];
      let cursor = 0;
      let match;

      WIKILINK.lastIndex = 0;
      while ((match = WIKILINK.exec(node.value)) !== null) {
        const [raw, target, display] = match;

        if (match.index > cursor) {
          children.push({ type: 'text', value: node.value.slice(cursor, match.index) });
        }

        const { id, error } = resolveTarget(target, idSpace);
        if (error) {
          throw new Error(`[wikilinks] [[${target}]] in ${sourcePath}: ${error}`);
        }

        // Bare `[[id]]` renders the target's title, not the raw id — an id in
        // running prose reads as a path, which is not what a link should say.
        const label = display?.trim() || idSpace.titles.get(id) || target.trim();
        children.push({
          type: 'link',
          url: `/${id}`,
          data: { hProperties: { className: 'wikilink' } },
          children: [{ type: 'text', value: label }],
        });

        cursor = match.index + raw.length;
      }

      if (children.length === 0) return;

      if (cursor < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...children);
      // Skip the nodes just inserted so the visitor doesn't rescan them.
      return index + children.length;
    });
  };
}
