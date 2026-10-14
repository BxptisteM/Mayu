import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../../src/sources/url.js';
import { isEditorialArticle, rankCandidates } from '../../src/sources/editorial-filter.js';

describe('Article URLs', () => {
  it('removes tracking, fragments and trailing slashes while sorting useful parameters', () => {
    expect(
      normalizeUrl('https://EXAMPLE.com/article///?z=2&utm_source=rss&a=1&fbclid=tracking#section'),
    ).toBe('https://example.com/article?a=1&z=2');
  });
  it('resolves relative links against the feed', () => {
    expect(normalizeUrl('/news', 'https://example.com/rss')).toBe('https://example.com/news');
  });
  it.each(['', 'invalid', 'javascript:alert(1)', 'ftp://example.com/file'])(
    'rejects invalid URL %s',
    (url) => {
      expect(normalizeUrl(url)).toBeNull();
    },
  );
});

describe('RSS editorial filtering', () => {
  const article = {
    title: 'Kernel security update',
    url: 'https://example.com/news',
    description: null,
    publishedAt: new Date('2026-10-14T10:00:00Z'),
  };
  it('filters sponsored titles', () => {
    expect(isEditorialArticle({ ...article, title: 'Sponsored webinar' })).toBe(false);
    expect(isEditorialArticle(article)).toBe(true);
  });
  it('ranks newest first without changing the input', () => {
    const older = { ...article, publishedAt: new Date('2026-10-13T10:00:00Z') };
    const input = [older, article];
    expect(rankCandidates(input)).toEqual([article, older]);
    expect(input).toEqual([older, article]);
  });
});
