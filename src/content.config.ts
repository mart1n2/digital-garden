import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 moved schema validation to Zod 4; `z` now comes from astro/zod.
import { z } from 'astro/zod';

/**
 * One collection for the whole garden. The section is derived from the
 * directory (the glob id is already `section/slug`), so it can't drift out of
 * sync with a frontmatter field. The canonical section list lives in
 * src/sections.mjs; `scripts/check-wikilinks.mjs` fails the build on a content
 * directory that isn't declared there.
 */
const garden = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/garden' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    draft: z.boolean().default(false),

    /**
     * Garden maturity. Only meaningful for `notes/`, where entries are revised
     * over time rather than published once.
     */
    maturity: z.enum(['seed', 'budding', 'evergreen']).optional(),

    /**
     * Presence marks a post-mortem — this replaces the old `kind` enum, which
     * collided with `research` as a section name.
     */
    incident: z
      .object({
        loss: z.string().optional(),
        scope: z
          .enum(['single-market', 'protocol-wide', 'cross-protocol', 'ecosystem'])
          .optional(),
        status: z.enum(['post-mortem', 'ongoing', 'unresolved']).optional(),
        occurredOn: z.coerce.date().optional(),
      })
      .optional(),

    /** Absolute URL to the protocol's KYP dashboard, when one exists. */
    relatedProtocol: z.url().optional(),
  }),
});

export const collections = { garden };
