import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectArticles } from '../../src/editorial/selector.js';
import { filters, resetDatabase, rows } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
const now = new Date('2026-10-14T12:00:00Z');
const article = {
  id: 'one',
  title: 'Ivanti critical vulnerability CVE-2026-12345 exploited',
  description: null,
  url: 'https://example.com/article',
  publishedAt: now,
  sourceId: 'source',
  sourceName: 'News',
};
beforeEach(() => {
  resetDatabase();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());
describe('Editorial article selection', () => {
  it('excludes events already covered by recent publication history', async () => {
    rows.push([], [article], [{ title: 'Ivanti flaw CVE-2026-12345 exploited in attacks' }]);
    expect(await selectArticles('CYBER', 'guild')).toEqual([]);
  });
  it('deduplicates event coverage and respects the selection limit', async () => {
    rows.push(
      [],
      [
        article,
        { ...article, id: 'two' },
        { ...article, id: 'other', title: 'Microsoft patch CVE-2026-99999', sourceId: 'other' },
      ],
      [],
    );
    const selected = await selectArticles('CYBER', 'guild', 1);
    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({ id: 'one', category: 'CYBER' });
  });
  it('limits a single source to two distinct events', async () => {
    const candidates = ['11111', '22222', '33333'].map((cve) => ({
      ...article,
      id: cve,
      title: `Critical vulnerability CVE-2026-${cve}`,
    }));
    rows.push([], candidates, []);
    expect(await selectArticles('CYBER', 'guild')).toHaveLength(2);
  });
  it('excludes promotions and uses a fallback source name', async () => {
    rows.push(
      [],
      [
        { ...article, sourceName: null },
        { ...article, title: 'Sponsored webinar' },
      ],
      [],
    );
    expect(await selectArticles('CYBER', 'guild')).toMatchObject([
      { sourceName: 'Unknown source' },
    ]);
  });
  it('handles empty candidates', async () => {
    expect(await selectArticles('CYBER', 'guild')).toEqual([]);
  });
  it('queries unpublished articles and guild-specific publication history', async () => {
    await selectArticles('CYBER', 'guild');
    expect(filters[0]?.params).toEqual(['guild']);
    expect(filters[1]?.sql).toContain('not exists');
    expect(filters[1]?.params).toEqual(['CYBER', false, '2026-10-13T12:00:00.000Z', 'guild']);
    expect(filters[2]?.params).toEqual(['guild', '2026-10-11T12:00:00.000Z']);
  });
});
