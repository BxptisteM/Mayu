import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRssArticles } from '../../src/sources/rss.provider.js';
vi.mock('../../src/config/env.js', () => ({ env: { SOURCES_FETCH_TIMEOUT_MS: 1000 } }));
const fetchMock = vi.fn<typeof fetch>();
const feed = (items: string) =>
  `<rss version="2.0"><channel><title>News</title><link>https://example.com</link><description>News</description>${items}</channel></rss>`;
const item =
  '<item><title> Kernel &amp; security </title><link>/article?utm_source=rss</link><pubDate>Wed, 14 Oct 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Update &amp;amp; fixes&lt;/p&gt;</description></item>';
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
describe('RSS downloads and normalization', () => {
  it('parses RSS and normalizes titles, links, descriptions and dates', async () => {
    fetchMock.mockResolvedValue(new Response(feed(item)));
    expect(await fetchRssArticles('https://example.com/rss')).toEqual([
      {
        title: 'Kernel & security',
        url: 'https://example.com/article',
        description: 'Update & fixes',
        publishedAt: new Date('2026-10-14T10:00:00Z'),
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/rss',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it('drops missing metadata and invalid URLs or dates', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        feed(
          '<item><title>Missing</title></item>' +
            item.replace('/article?utm_source=rss', 'javascript:alert(1)') +
            item.replace('Wed, 14 Oct 2026 10:00:00 GMT', 'invalid'),
        ),
      ),
    );
    expect(await fetchRssArticles('https://example.com/rss')).toEqual([]);
  });
  it('uses null for missing descriptions', async () => {
    fetchMock.mockResolvedValue(
      new Response(feed(item.replace(/<description>.*?<\/description>/, ''))),
    );
    expect(await fetchRssArticles('https://example.com/rss')).toMatchObject([
      { description: null },
    ]);
  });
  it('handles an empty feed', async () => {
    fetchMock.mockResolvedValue(new Response(feed('')));
    expect(await fetchRssArticles('https://example.com/rss')).toEqual([]);
  });
  it('rejects malformed XML', async () => {
    fetchMock.mockResolvedValue(new Response('not XML'));
    await expect(fetchRssArticles('https://example.com/rss')).rejects.toThrow();
  });
  it('rejects HTTP failures', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    await expect(fetchRssArticles('https://example.com/rss')).rejects.toThrow('HTTP 503');
  });
  it('propagates request timeouts', async () => {
    fetchMock.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
    await expect(fetchRssArticles('https://example.com/rss')).rejects.toThrow('Timed out');
  });
  it('rejects responses without a body', async () => {
    fetchMock.mockResolvedValue(new Response(null));
    await expect(fetchRssArticles('https://example.com/rss')).rejects.toThrow('no body');
  });
  it('rejects oversized feeds before parsing', async () => {
    fetchMock.mockResolvedValue(new Response('x'.repeat(5 * 1024 * 1024 + 1)));
    await expect(fetchRssArticles('https://example.com/rss')).rejects.toThrow(
      'maximum allowed size',
    );
  });
});
