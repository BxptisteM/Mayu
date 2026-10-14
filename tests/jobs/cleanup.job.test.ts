import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runDatabaseCleanup } from '../../src/jobs/cleanup.job.js';
import { database, filters, resetDatabase, rows } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn() } }));
beforeEach(resetDatabase);
describe('Database cleanup eligibility', () => {
  it('reports deleted rows and excludes selected articles and running jobs', async () => {
    rows.push([], [{ id: 'article' }], [{ id: 'episode' }], [{ id: 'snapshot' }], [{ id: 'run' }]);
    expect(await runDatabaseCleanup(new Date('2026-10-14T12:00:00Z'))).toEqual({
      articlesDeleted: 1,
      episodesDeleted: 1,
      snapshotsDeleted: 1,
      jobRunsDeleted: 1,
    });
    expect(filters[1]?.sql).toContain('not exists');
    expect(filters[0]?.sql).toContain('"selections"."article_id" = "articles"."id"');
    expect(filters[1]?.params).toEqual(['2026-09-14T12:00:00.000Z']);
    expect(filters[4]?.sql).toContain("<> 'running'");
    expect(filters[4]?.params).toEqual(['2026-07-16T12:00:00.000Z']);
    expect(database.delete).toHaveBeenCalledTimes(4);
  });
  it('reports zero counts when nothing is eligible', async () => {
    expect(await runDatabaseCleanup()).toEqual({
      articlesDeleted: 0,
      episodesDeleted: 0,
      snapshotsDeleted: 0,
      jobRunsDeleted: 0,
    });
  });
});
