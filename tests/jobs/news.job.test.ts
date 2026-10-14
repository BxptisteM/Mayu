import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runNewsJob } from '../../src/jobs/news.job.js';
import { selectArticles } from '../../src/editorial/selector.js';
import { collectArticles } from '../../src/sources/collector.js';
import { publishArticle } from '../../src/services/publication.service.js';
import { resetDatabase, rows } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/config/env.js', () => ({
  env: { ARTICLES_DAILY_PUBLISH_LIMIT: 5, ARTICLES_MORE_PUBLISH_LIMIT: 3 },
}));
vi.mock('../../src/editorial/selector.js', () => ({ selectArticles: vi.fn() }));
vi.mock('../../src/sources/collector.js', () => ({ collectArticles: vi.fn() }));
vi.mock('../../src/services/publication.service.js', () => ({ publishArticle: vi.fn() }));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
const article = {
  id: 'one',
  title: 'News',
  description: 'Source',
  url: 'https://example.com/news',
  publishedAt: new Date('2026-10-14'),
  sourceId: null,
  sourceName: 'News',
  category: 'CYBER' as const,
  score: 80,
};
beforeEach(() => {
  resetDatabase();
  vi.mocked(selectArticles).mockResolvedValue([article]);
});
describe('News publication jobs', () => {
  it('collects daily news up to the remaining quota', async () => {
    rows.push([{ language: 'en' }], [{ total: 3 }]);
    expect(await runNewsJob('CYBER', 'guild', 'daily')).toEqual({
      category: 'CYBER',
      requested: 2,
      published: 1,
      failed: 0,
      remaining: 1,
    });
    expect(collectArticles).toHaveBeenCalledWith('CYBER');
    expect(selectArticles).toHaveBeenCalledWith('CYBER', 'guild', 2);
    expect(publishArticle).toHaveBeenCalledWith(article, 'guild', 'en');
  });
  it('does no collection or publishing when the daily quota is reached', async () => {
    rows.push([], [{ total: 5 }]);
    expect(await runNewsJob('CYBER', 'guild', 'daily')).toMatchObject({
      requested: 0,
      published: 0,
    });
    expect(collectArticles).not.toHaveBeenCalled();
    expect(selectArticles).not.toHaveBeenCalled();
  });
  it('publishes additional articles without another collection', async () => {
    rows.push([], [{ total: 5 }]);
    expect(await runNewsJob('CYBER', 'guild', 'more')).toMatchObject({
      requested: 3,
      published: 1,
    });
    expect(collectArticles).not.toHaveBeenCalled();
    expect(publishArticle).toHaveBeenCalledWith(article, 'guild', 'fr');
  });
  it('continues after individual publication failures', async () => {
    rows.push([], [{ total: 0 }]);
    vi.mocked(selectArticles).mockResolvedValue([article, { ...article, id: 'two' }]);
    vi.mocked(publishArticle).mockRejectedValueOnce(new Error('Discord failure'));
    expect(await runNewsJob('CYBER', 'guild', 'daily')).toMatchObject({
      failed: 1,
      published: 1,
      remaining: 4,
    });
  });
  it('prevents overlapping jobs and releases protection after failure', async () => {
    rows.push([], [{ total: 0 }]);
    let rejectCollection: (error: Error) => void = () => {
      throw new Error('Collection not started');
    };
    let acknowledgeStart: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      acknowledgeStart = resolve;
    });
    vi.mocked(collectArticles).mockImplementationOnce(() => {
      acknowledgeStart();
      return new Promise((_, reject) => {
        rejectCollection = reject;
      });
    });
    const running = runNewsJob('CYBER', 'guild', 'daily');
    const failure = expect(running).rejects.toThrow('Collection failed');
    await started;
    await expect(runNewsJob('CYBER', 'guild', 'daily')).rejects.toThrow('already running');
    rejectCollection(new Error('Collection failed'));
    await failure;
    rows.push([], [{ total: 5 }]);
    expect(await runNewsJob('CYBER', 'guild', 'daily')).toMatchObject({ requested: 0 });
  });
});
