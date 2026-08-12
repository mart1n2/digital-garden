import { defineConfig, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { remarkWikilinks } from './src/plugins/remark-wikilinks.mjs';

export default defineConfig({
  // Must match the CNAME file and the Pages custom domain. www, matching the
  // www.kyp.one convention; the cert covers both www and apex.
  site: 'https://www.mart1n.xyz',
  base: '/',

  // Astro 7 changed the default from `true` to `'jsx'`, which strips whitespace
  // between inline elements React-style. This markup relies on HTML whitespace
  // rules (adjacent <span>/<time> on separate lines need the space), so keep
  // the pre-7 behavior rather than auditing every inline boundary.
  compressHTML: true,

  integrations: [sitemap()],

  // Self-hosted via the built-in Fonts API — replaces the @fontsource-variable
  // packages and their layout-level imports.
  fonts: [
    {
      // Editorial serif — carries headings and body prose. Newsreader is a
      // screen-first variable serif with a real italic, which is what long
      // technical prose needs.
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      weights: ['200 800'],
      styles: ['normal', 'italic'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      // Deliberately not --font-sans: global.css defines the Tailwind
      // --font-sans theme token *in terms of* this one, and reusing the name
      // would make that definition self-referential.
      cssVariable: '--font-inter',
      weights: ['100 900'],
      styles: ['normal'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: ['100 800'],
      styles: ['normal'],
    },
  ],

  markdown: {
    // Sätteri, Astro 7's default pipeline, cannot run remark plugins at all —
    // it's a Rust AST. The wikilink resolver is a remark plugin, so opt back
    // into unified. Build speed is irrelevant at this content volume.
    // Plugins go inside unified(); the top-level markdown.remarkPlugins option
    // is deprecated in Astro 7.
    processor: unified({ remarkPlugins: [remarkWikilinks] }),
    shikiConfig: {
      // Both palettes are emitted as CSS variables; global.css activates one
      // per [data-theme] so code blocks follow the site theme.
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
      },
    },
  },
});
