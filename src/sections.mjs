/**
 * Canonical section list and presentation metadata.
 *
 * Plain .mjs so the build scripts (`scripts/check-wikilinks.mjs`), the remark
 * plugin, and the .astro routes all read the same definition — a section list
 * duplicated between a Node script and TypeScript would drift.
 *
 * A section IS a directory under src/content/garden. Adding one means creating
 * the directory and adding an entry here; the checker fails on a directory that
 * isn't listed, which catches typo'd folder names.
 */

/** @typedef {'security' | 'research' | 'engineering' | 'notes'} Section */

/** Display order across the site. */
export const SECTIONS = /** @type {const} */ ([
  'security',
  'research',
  'engineering',
  'notes',
]);

export const SECTION_META = {
  security: {
    label: 'Security',
    blurb:
      'Incident post-mortems and vulnerability analysis — what broke, how the attack actually worked, and what the code got wrong.',
    /** Evergreen garden entries get maturity + backlinks instead of a TOC. */
    garden: false,
  },
  research: {
    label: 'Research',
    blurb:
      'Longer-form investigation into how systems are designed, where trust actually sits, and the trade-offs that create risk.',
    garden: false,
  },
  engineering: {
    label: 'Engineering',
    blurb: 'Building things — tooling, infrastructure, and notes from the workbench.',
    garden: false,
  },
  notes: {
    label: 'Notes',
    blurb:
      'Short entries, tended rather than published. These get revised as understanding changes.',
    garden: true,
  },
};

/** @param {string} id A collection id shaped `section/slug`. */
export function sectionOf(id) {
  return id.split('/')[0];
}

/** @param {string} id */
export function slugOf(id) {
  return id.split('/').slice(1).join('/');
}

/** @param {string} id */
export function urlOf(id) {
  return `/${id}`;
}
