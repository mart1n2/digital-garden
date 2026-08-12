# digital-garden

> A personal knowledge base — incident post-mortems and security research, plus engineering notes
> and shorter entries that get revised rather than finished.

[![Deploy to GitHub Pages](https://github.com/mart1n2/digital-garden/actions/workflows/deploy.yml/badge.svg)](https://github.com/mart1n2/digital-garden/actions/workflows/deploy.yml)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build/)

**[www.mart1n.xyz](https://www.mart1n.xyz)** · **[Protocol database → kyp.one](https://www.kyp.one)**

Split out of [`kyp`](https://github.com/mart1n2/kyp) so the writing and the protocol database can
serve different audiences. That repository is now the database only; all long-form writing lives here.

## Sections

| Section | What goes in it |
| --- | --- |
| `security/` | Incident post-mortems and vulnerability analysis — what broke and what the code got wrong |
| `research/` | Longer-form investigation into system design, where trust sits, and the trade-offs that create risk |
| `engineering/` | Tooling, infrastructure, and notes from building things |
| `notes/` | Short evergreen entries, tended rather than published |

A section **is** a directory. Sections are not a frontmatter field — the value is derived from the
content path, so it cannot drift out of sync with where a file actually lives.

`notes/` is a *format*, not a topic: entries there carry a maturity label and always show a backlinks
panel, and they skip the table of contents. The other three are finished long-form.

## Layout

```text
src/
├── content/garden/
│   ├── security/<slug>.md
│   ├── research/<slug>.md
│   ├── engineering/
│   └── notes/
├── components/
├── pages/
│   ├── index.astro              # Latest across sections + section cards
│   ├── [section]/index.astro    # One template → four section indexes
│   ├── [section]/[...slug].astro# One template → every entry
│   ├── about.astro
│   ├── rss.xml.js
│   └── 404.astro
├── plugins/remark-wikilinks.mjs # [[wikilink]] resolution
├── sections.mjs                 # Canonical section list + labels
├── styles/global.css            # Theme tokens and component classes
└── utils/

scripts/check-wikilinks.mjs      # Prebuild link gate (see below)
public/CNAME                     # Custom domain — must be in public/, not the repo root
postbuild.mjs                    # Pagefind search-index generation
```

## Add an entry

1. Create `src/content/garden/<section>/<slug>.md`.
2. Add frontmatter (below). The URL becomes `/<section>/<slug>`.
3. Run `npm run build`.

```yaml
---
title: "Inflating liquidityIndex with flashloan premiums"
date: 2025-12-26
updated: 2026-05-08          # optional; shown as "updated", and sorts ahead of date
tags: ["lending", "flashloan"]
description: "One-paragraph standfirst, used in listings, RSS, and meta tags."
draft: false                 # optional; drafts are excluded everywhere

# Optional. Presence marks the entry as a post-mortem and renders the incident
# badge. There is no `kind` field — this block is the signal.
incident:
  loss: "≈4 LBTC (~4 BTC)"
  scope: single-market       # single-market | protocol-wide | cross-protocol | ecosystem
  status: post-mortem        # post-mortem | ongoing | unresolved
  occurredOn: 2025-12-25

# Optional, notes/ only. seed | budding | evergreen
maturity: budding

# Optional. Absolute URL to the protocol's KYP dashboard.
relatedProtocol: "https://www.kyp.one/protocols/saturn-credit"
---
```

Schema is enforced at build time in [`src/content.config.ts`](src/content.config.ts).

## Add a section

1. Create `src/content/garden/<name>/`.
2. Add an entry to `SECTION_META` in [`src/sections.mjs`](src/sections.mjs) with a `label`, a `blurb`,
   and `garden: true|false`.

Nav, footer, section index, RSS categories, and the search badge all derive from that list — no route
or component changes. A content directory that isn't declared **fails the build**, which catches
typo'd folder names.

## Wikilinks and backlinks

Link between entries with `[[target]]` or `[[target|display text]]`:

```markdown
See [[zerolend-liquidity-index-manipulation]] for a worked case, and
[[security/summerfi-fleetcommander-nav-donation-drain|the FleetCommander drain]].
```

- A bare slug works; a `section/slug` id is also accepted. An ambiguous bare slug (same name in two
  sections) is an error rather than a silent pick.
- Bare links render the **target's title**, not the raw id.
- Links inside code fences and inline code are ignored.
- Every entry page lists what links back to it. `notes/` shows the panel even when empty.

**A broken link fails the build.** Note that the remark plugin's own `throw` is *not* what enforces
this: Astro's glob loader catches markdown render errors, logs them, and still exits `0`. The gate is
[`scripts/check-wikilinks.mjs`](scripts/check-wikilinks.mjs), which runs before `astro build`, shares
its resolution logic with the plugin so the two can't diverge, reports every failure with
`file:line`, and exits non-zero.

## Local development

Requires Node.js 22+ (24 in CI).

```bash
npm ci
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Astro dev server on `http://localhost:4321` |
| `npm run build` | Check wikilinks, build, then generate the Pagefind index |
| `npm run check:links` | Run the wikilink gate on its own |
| `npm run preview` | Preview the production build |
| `npm run clean` | Stop the dev server and clear `dist/`, `.astro/`, `node_modules/.astro` |

Two things worth knowing before debugging:

- **Rendered markdown is cached in `node_modules/.astro/data-store.json`.** Editing a remark plugin
  does *not* invalidate it, so plugin changes appear to do nothing. Run `npm run clean`. The
  root-level `.astro/` directory is only generated types and is unrelated.
- **`console.log` inside a remark plugin is swallowed** by Astro's logger. Write to a file if you need
  to confirm a plugin ran at all.
- Pagefind's binary download fails on some platforms locally; `postbuild.mjs` treats that as
  non-fatal and CI is authoritative for the search index.

## Stack

- [Astro 7](https://astro.build/) — static output, content collections
- [Tailwind CSS 4](https://tailwindcss.com/) via `@tailwindcss/vite`, with semantic theme tokens in
  `global.css` mapped to utilities through `@theme inline`
- Newsreader / Inter / JetBrains Mono, self-hosted via Astro's built-in Fonts API
- [Pagefind](https://pagefind.app/) for client-side full-text search
- GitHub Actions → GitHub Pages

Astro 7 specifics this project depends on:

- **Sätteri**, the default markdown pipeline, cannot run remark or rehype plugins at all. Since the
  wikilink resolver is a remark plugin, `markdown.processor` is set to `unified()` from
  `@astrojs/markdown-remark`. Plugins go *inside* `unified({ remarkPlugins: [...] })`; the top-level
  `markdown.remarkPlugins` option is deprecated.
- **`compressHTML: true`** restores pre-7 whitespace handling. Astro 7 defaults to `'jsx'`, which
  strips whitespace between inline elements and would glue words together.
- MDX is deliberately not installed — its Astro 7 build peers on Sätteri, and no content needs it.

## Deployment

Pushes to `main` run the Pages workflow and publish `dist/` to
[www.mart1n.xyz](https://www.mart1n.xyz). The custom domain comes from `public/CNAME`; a `CNAME` at
the repo root is **not** copied into the build output and has no effect.

## Disclaimer

Personal writing. Nothing here is investment advice, and nothing here speaks for an employer.
Post-mortems describe already-public incidents; they are not vulnerability disclosures.
