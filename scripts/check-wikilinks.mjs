#!/usr/bin/env node
/**
 * Prebuild gate for wikilinks.
 *
 * The remark plugin throws on an unresolved link, but Astro's glob loader
 * catches render errors, logs them, and still exits 0 — so a broken link would
 * ship silently. This runs the same resolution ahead of `astro build`, reports
 * every failure at once, and exits non-zero.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CONTENT_ROOT,
  WIKILINK,
  collectIds,
  resolveTarget,
  stripCode,
} from '../src/plugins/remark-wikilinks.mjs';
import { SECTIONS } from '../src/sections.mjs';

// A directory that isn't a declared section would render post pages with no
// section index and no nav entry — almost always a typo'd folder name.
const unknownDirs = fs
  .readdirSync(CONTENT_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory() && !SECTIONS.includes(d.name))
  .map(d => d.name);

if (unknownDirs.length > 0) {
  console.error(
    `\n✘ Unknown content director${unknownDirs.length === 1 ? 'y' : 'ies'}: ` +
      `${unknownDirs.join(', ')}\n` +
      `  Declared sections: ${SECTIONS.join(', ')}\n` +
      `  Add the section to src/sections.mjs, or rename the directory.\n`
  );
  process.exit(1);
}

const idSpace = collectIds();
const problems = [];
let linkCount = 0;
let fileCount = 0;

for (const section of SECTIONS) {
  const dir = path.join(CONTENT_ROOT, section);
  if (!fs.existsSync(dir)) continue;

  for (const entry of fs.readdirSync(dir).sort()) {
    if (!entry.endsWith('.md')) continue;
    fileCount++;

    const filePath = path.join(dir, entry);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const scannable = stripCode(raw);

    WIKILINK.lastIndex = 0;
    let match;
    while ((match = WIKILINK.exec(scannable)) !== null) {
      linkCount++;
      const { error } = resolveTarget(match[1], idSpace);
      if (error) {
        const line = scannable.slice(0, match.index).split('\n').length;
        problems.push({
          file: `${path.relative(process.cwd(), filePath)}:${line}`,
          link: match[0],
          error,
        });
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`\n✘ ${problems.length} unresolved wikilink(s):\n`);
  for (const p of problems) {
    console.error(`  ${p.file}`);
    console.error(`    ${p.link} — ${p.error}\n`);
  }
  console.error(`  Known ids:\n    ${[...idSpace.ids].sort().join('\n    ')}\n`);
  process.exit(1);
}

console.log(`✓ wikilinks: ${linkCount} link(s) across ${fileCount} file(s) resolve`);
