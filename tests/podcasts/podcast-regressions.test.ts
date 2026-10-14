import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPodcastEpisodes } from '../../src/podcasts/podcast.provider.js';
vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
const fetchMock = vi.fn<typeof fetch>();
const now = new Date('2026-10-14T12:00:00Z');
function feed(link: string, description: string): string {
  return `<rss version="2.0"><channel><title>Tech</title><link>https://example.com</link><description>Tech</description><item><title>Episode</title><link>${link}</link><pubDate>Wed, 14 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[${description}]]></description></item></channel></rss>`;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(readFile).mockResolvedValue(
    JSON.stringify([{ name: 'Tech', url: 'https://example.com/rss' }]),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe('Known podcast normalization defects', () => {
  it.fails('rejects episode links with unsupported protocols', async () => {
    fetchMock.mockResolvedValue(new Response(feed('javascript:alert(1)', 'Episode description')));
    expect(await fetchPodcastEpisodes(now)).toEqual([]);
  });
  it.fails('removes script contents from descriptions parsed by rss-parser', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        feed(
          'https://example.com/episode',
          '<script>unwantedScript()</script><p>Useful description</p>',
        ),
      ),
    );
    expect(await fetchPodcastEpisodes(now)).toMatchObject([{ description: 'Useful description' }]);
  });
});
