import { execSync } from 'node:child_process';

// Pagefind indexes the built HTML, so it can only run after `astro build`.
// A local failure here is non-fatal — the binary download is flaky on some
// machines and CI is the authoritative build.
try {
  execSync('npx pagefind --site dist --output-path dist/pagefind', { stdio: 'inherit' });
  console.log('Pagefind index generated');
} catch {
  console.log('Pagefind generation failed, continuing without search index');
}
