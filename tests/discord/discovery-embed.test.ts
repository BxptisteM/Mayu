import { describe, expect, it } from 'vitest';
import { buildGitHubEmbed, buildPodcastEmbed } from '../../src/discord/embeds/discovery.embed.js';
import { serializeArticleEmbed } from '../../src/discord/embeds/article.embed.js';
describe('Discovery embeds', () => {
  it('formats repository statistics and missing metadata', () => {
    const embed = buildGitHubEmbed({
      id: 1,
      fullName: 'owner/tool',
      url: 'https://github.com/owner/tool',
      description: null,
      language: null,
      stars: 1234,
      forks: 100,
      createdAt: new Date('2026-10-13'),
      pushedAt: new Date('2026-10-14'),
    }).toJSON();
    expect(embed).toMatchObject({
      title: 'owner/tool',
      description: 'No description provided.',
      fields: [
        { name: 'Stars', value: '1,234', inline: true },
        { name: 'Forks', value: '100', inline: true },
        { name: 'Language', value: 'Unknown', inline: true },
      ],
    });
  });
  it('uses podcast publication dates and description fallback', () => {
    expect(
      buildPodcastEmbed({
        podcastName: 'Tech',
        guid: 'one',
        title: 'Episode',
        url: 'https://example.com/episode',
        description: '',
        feedUrl: 'https://example.com/rss',
        publishedAt: new Date('2026-10-14T10:00:00Z'),
      }).toJSON(),
    ).toMatchObject({
      title: 'Episode',
      description: 'No episode description provided.',
      timestamp: '2026-10-14T10:00:00.000Z',
      fields: [{ name: 'Podcast', value: 'Tech', inline: true }],
    });
  });
  it('truncates article fields to Discord limits', () => {
    const embed = serializeArticleEmbed({
      title: 'x'.repeat(300),
      url: 'https://example.com/news',
      summary: 'x'.repeat(5000),
      sourceName: 'x'.repeat(1200),
      category: 'CYBER',
      publishedAt: new Date('2026-10-14'),
    });
    expect(embed.title).toHaveLength(256);
    expect(embed.description).toHaveLength(4096);
    expect(embed.fields?.[0]?.value).toHaveLength(1024);
  });
});
