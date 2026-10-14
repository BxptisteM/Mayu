import { describe, expect, it } from 'vitest';
import { calculateRelevance, isPromotionalContent } from '../../src/editorial/relevance.js';
import { groupEvents } from '../../src/editorial/events.js';
import type { RankedArticle } from '../../src/editorial/types.js';

const now = new Date('2026-10-14T12:00:00Z');
const article: RankedArticle = {
  id: 'one',
  title: 'Critical vulnerability CVE-2026-12345 actively exploited',
  description: null,
  url: 'https://example.com/article',
  publishedAt: now,
  sourceId: 'source',
  sourceName: 'News',
  category: 'CYBER',
  score: 80,
};

describe('Editorial relevance', () => {
  it('adds importance signals to freshness without requiring a description', () => {
    expect(calculateRelevance(article, now)).toBe(85);
  });
  it('caps description quality and importance at a total score of 100', () => {
    expect(calculateRelevance({ ...article, description: 'x'.repeat(1000) }, now)).toBe(100);
  });
  it('removes freshness from articles at least one day old', () => {
    expect(
      calculateRelevance({ ...article, publishedAt: new Date('2026-10-13T12:00:00Z') }, now),
    ).toBe(45);
  });
  it('does not give future articles extra freshness', () => {
    expect(
      calculateRelevance({ ...article, publishedAt: new Date('2026-10-15T12:00:00Z') }, now),
    ).toBe(85);
  });
  it.each(['Sponsored product', 'Register now for a webinar', 'Start a free trial'])(
    'rejects promotional title %s',
    (title) => {
      expect(isPromotionalContent({ ...article, title })).toBe(true);
    },
  );
  it('keeps editorial coverage', () => {
    expect(isPromotionalContent(article)).toBe(false);
  });
});

describe('Editorial event grouping', () => {
  it('chooses the strongest representative and rewards distinct sources', () => {
    const stronger = { ...article, id: 'two', score: 90, sourceId: 'other' };
    expect(groupEvents([article, stronger])).toEqual([
      { representative: stronger, articles: [article, stronger], sourceCount: 2, score: 95 },
    ]);
  });
  it('does not count repeat coverage from one source as corroboration', () => {
    expect(groupEvents([article, { ...article, id: 'two' }])[0]).toMatchObject({
      sourceCount: 1,
      score: 80,
    });
  });
  it('keeps different CVEs separate', () => {
    expect(
      groupEvents([
        article,
        { ...article, title: 'Critical vulnerability CVE-2026-99999 actively exploited' },
      ]),
    ).toHaveLength(2);
  });
  it('handles no candidates', () => {
    expect(groupEvents([])).toEqual([]);
  });
});
