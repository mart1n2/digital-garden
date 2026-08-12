import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { compareEntries } from '../utils/entries';
import { SECTION_META, sectionOf } from '../sections.mjs';

export async function GET(context) {
  const entries = (await getCollection('garden', ({ data }) => !data.draft)).sort(compareEntries);

  return rss({
    title: 'mart1n',
    description:
      'Security research, incident post-mortems, engineering notes, and shorter garden entries.',
    site: context.site,
    items: entries.map(entry => ({
      title: entry.data.title,
      description: entry.data.description ?? '',
      pubDate: entry.data.updated ?? entry.data.date,
      link: `/${entry.id}`,
      // Section as a category alongside tags, so readers can filter a firehose feed.
      categories: [SECTION_META[sectionOf(entry.id)].label, ...entry.data.tags],
    })),
    customData: '<language>en</language>',
  });
}
