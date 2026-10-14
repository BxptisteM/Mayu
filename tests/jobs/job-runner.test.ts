import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeScheduledJob } from '../../src/jobs/job-runner.js';
import { resetDatabase, rows, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
beforeEach(resetDatabase);
describe('Scheduled job reporting', () => {
  it('records successful operation counts', async () => {
    rows.push([{ id: 'run' }]);
    await executeScheduledJob('news:CYBER', async () => ({ fetched: 10, published: 5, failed: 0 }));
    expect(writes).toEqual([
      { job: 'news:CYBER', trigger: 'cron', status: 'running' },
      expect.objectContaining({
        status: 'success',
        articlesFetched: 10,
        articlesPublished: 5,
        error: null,
      }),
    ]);
  });
  it('reports partial failures', async () => {
    rows.push([{ id: 'run' }]);
    await executeScheduledJob('news', async () => ({ fetched: 10, published: 4, failed: 1 }));
    expect(writes).toContainEqual(
      expect.objectContaining({ status: 'failed', error: '1 item(s) failed' }),
    );
  });
  it('records operation errors without rejecting independent jobs', async () => {
    rows.push([{ id: 'run' }]);
    await executeScheduledJob('news', async () => {
      throw new Error('Collection failed');
    });
    expect(writes).toContainEqual(
      expect.objectContaining({ status: 'failed', error: 'Collection failed' }),
    );
  });
  it('does not run an operation without its execution record', async () => {
    const operation = vi.fn();
    await expect(executeScheduledJob('news', operation)).rejects.toThrow('Failed to create');
    expect(operation).not.toHaveBeenCalled();
  });
});
