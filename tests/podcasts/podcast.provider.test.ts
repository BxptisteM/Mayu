import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPodcastEpisodes } from '../../src/podcasts/podcast.provider.js';
vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
const fetchMock = vi.fn<typeof fetch>();
const now = new Date('2026-10-14T12:00:00Z');
const config = [{ name: 'Tech', url: 'https://example.com/rss' }];
const feed = (items: string) =>
  `<rss version="2.0"><channel><title>Tech</title><link>https://example.com</link><description>Tech</description>${items}</channel></rss>`;
const item = (index: number, date = 'Wed, 14 Oct 2026 10:00:00 GMT') =>
  `<item><title> Episode ${index} </title><link>https://example.com/${index}</link><pubDate>${date}</pubDate><description><![CDATA[<p>Useful &amp; clear</p>]]></description></item>`;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(readFile).mockResolvedValue(JSON.stringify(config));
});
afterEach(() => vi.unstubAllGlobals());
describe('Podcast feed discovery', () => {
  it('normalizes episodes and uses the link when the GUID is missing', async () => {
    fetchMock.mockResolvedValue(new Response(feed(item(1))));
    expect(await fetchPodcastEpisodes(now)).toEqual([
      {
        podcastName: 'Tech',
        guid: 'https://example.com/1',
        title: 'Episode 1',
        url: 'https://example.com/1',
        description: 'Useful & clear',
        feedUrl: config[0]?.url,
        publishedAt: new Date('2026-10-14T10:00:00Z'),
      },
    ]);
  });
  it('sorts recent episodes and limits candidates to ten', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        feed(
          item(99, 'Tue, 13 Oct 2026 10:00:00 GMT') +
            Array.from({ length: 11 }, (_, index) => item(index)).join(''),
        ),
      ),
    );
    const episodes = await fetchPodcastEpisodes(now);
    expect(episodes).toHaveLength(10);
    expect(episodes.map((episode) => episode.title)).not.toContain('Episode 99');
  });
  it('drops missing metadata, invalid dates, old episodes and future episodes', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        feed(
          '<item><title>Missing</title></item>' +
            item(1, 'invalid') +
            item(2, 'Thu, 15 Oct 2026 10:00:00 GMT') +
            item(3, 'Thu, 01 Oct 2026 10:00:00 GMT'),
        ),
      ),
    );
    expect(await fetchPodcastEpisodes(now)).toEqual([]);
  });
  it('does not fetch disabled podcasts', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ ...config[0], enabled: false }]));
    expect(await fetchPodcastEpisodes(now)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    new Response('not XML'),
    new Response('', { status: 500 }),
    new Response(null),
    new Response('', { headers: { 'content-length': String(32 * 1024 * 1024 + 1) } }),
  ])('isolates feed failures', async (response) => {
    fetchMock.mockResolvedValue(response);
    expect(await fetchPodcastEpisodes(now)).toEqual([]);
  });
  it('continues collecting after an individual feed fails', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify([...config, { name: 'Other', url: 'https://other.example/rss' }]),
    );
    fetchMock
      .mockRejectedValueOnce(new Error('Timed out'))
      .mockResolvedValueOnce(new Response(feed(item(1))));
    expect(await fetchPodcastEpisodes(now)).toMatchObject([{ podcastName: 'Other' }]);
  });
  it('rejects unsupported feed protocols', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify([{ name: 'Invalid', url: 'ftp://example.com/rss' }]),
    );
    await expect(fetchPodcastEpisodes(now)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
