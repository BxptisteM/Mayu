import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectArticles } from '../../src/sources/collector.js';
import { fetchRssArticles } from '../../src/sources/rss.provider.js';
import { filters, resetDatabase, rows, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/config/env.js', () => ({
  env: {
    ARTICLES_LOOKBACK_HOURS: 24,
    SOURCES_MAX_CONCURRENCY: 2,
    ARTICLES_MAX_PER_SOURCE: 5,
    ARTICLES_MAX_PER_CATEGORY: 3,
  },
}));
vi.mock('../../src/sources/rss.provider.js', () => ({ fetchRssArticles: vi.fn() }));
vi.mock('../../src/shared/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
const now = new Date('2026-10-14T12:00:00Z');
const source = { id: 'source', name: 'News', url: 'https://example.com/rss' };
const article = {
  title: 'Critical zero-day vulnerability actively exploited',
  url: 'https://example.com/news',
  description: null,
  publishedAt: now,
};
beforeEach(() => {
  resetDatabase();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.mocked(fetchRssArticles).mockReset();
});
afterEach(() => vi.useRealTimers());
describe('RSS article collection', () => {
  it('normalizes collection counts and stores accepted category membership', async () => {
    rows.push([source], [{ count: 0 }], [{ id: 'article' }]);
    vi.mocked(fetchRssArticles).mockResolvedValue([article]);
    expect(await collectArticles('CYBER')).toEqual({
      category: 'CYBER',
      sourcesProcessed: 1,
      sourcesFailed: 0,
      articlesFetched: 1,
      articlesInserted: 1,
    });
    expect(writes).toEqual([
      { sourceId: 'source', ...article },
      { articleId: 'article', category: 'CYBER' },
    ]);
  });
  it('isolates feed failures and still processes healthy sources', async () => {
    rows.push(
      [source, { ...source, id: 'other', url: 'https://other.example/rss' }],
      [{ count: 0 }],
      [{ id: 'article' }],
    );
    vi.mocked(fetchRssArticles)
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce([article]);
    expect(await collectArticles('CYBER')).toMatchObject({
      sourcesProcessed: 1,
      sourcesFailed: 1,
      articlesInserted: 1,
    });
  });
  it('filters stale, future, promotional and unrelated articles', async () => {
    rows.push([source], [{ count: 0 }]);
    vi.mocked(fetchRssArticles).mockResolvedValue([
      { ...article, publishedAt: new Date('2026-10-12') },
      { ...article, publishedAt: new Date('2026-10-15') },
      { ...article, title: 'Sponsored webinar' },
      { ...article, title: 'Local restaurant opens' },
    ]);
    expect(await collectArticles('CYBER')).toMatchObject({
      articlesFetched: 4,
      articlesInserted: 0,
    });
    expect(writes).toEqual([]);
  });
  it('does not collect RSS articles for GitHub discovery', async () => {
    rows.push([source], [{ count: 0 }]);
    vi.mocked(fetchRssArticles).mockResolvedValue([article]);
    expect(await collectArticles('GITHUB')).toMatchObject({ articlesInserted: 0 });
  });
  it('respects the remaining daily category limit', async () => {
    rows.push([source], [{ count: 3 }]);
    vi.mocked(fetchRssArticles).mockResolvedValue([article]);
    expect(await collectArticles('CYBER')).toMatchObject({ articlesInserted: 0 });
    expect(writes).toEqual([]);
  });
  it('deduplicates candidate URLs across sources', async () => {
    rows.push([source, { ...source, id: 'other' }], [{ count: 0 }], [{ id: 'article' }]);
    vi.mocked(fetchRssArticles).mockResolvedValue([article]);
    expect(await collectArticles('CYBER')).toMatchObject({
      articlesFetched: 2,
      articlesInserted: 1,
    });
    expect(writes).toHaveLength(2);
  });
  it('adds category membership for an article already stored by URL', async () => {
    rows.push([source], [{ count: 0 }], [], [{ id: 'existing' }]);
    vi.mocked(fetchRssArticles).mockResolvedValue([article]);
    expect(await collectArticles('CYBER')).toMatchObject({ articlesInserted: 0 });
    expect(writes).toContainEqual({ articleId: 'existing', category: 'CYBER' });
  });
  it('handles no active sources', async () => {
    rows.push([], [{ count: 0 }]);
    expect(await collectArticles('CYBER')).toMatchObject({
      sourcesProcessed: 0,
      articlesFetched: 0,
      articlesInserted: 0,
    });
    expect(fetchRssArticles).not.toHaveBeenCalled();
  });
  it('requests only enabled RSS sources tagged for the requested category', async () => {
    rows.push([], [{ count: 0 }]);
    await collectArticles('CYBER');
    expect(filters[0]?.sql).toContain('"sources"."enabled"');
    expect(filters[0]?.sql).toContain('"sources"."type"');
    expect(filters[0]?.sql).toContain('@>');
    expect(filters[0]?.params).toEqual([true, 'rss', '{"CYBER"}']);
  });
});
