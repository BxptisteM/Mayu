import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import cron from 'node-cron';
import { startScheduler, stopScheduler } from '../../src/jobs/scheduler.js';
import { executeScheduledJob } from '../../src/jobs/job-runner.js';
import { runNewsJob } from '../../src/jobs/news.job.js';
import { runDiscoveryJob } from '../../src/jobs/discovery.job.js';
import { runDatabaseCleanup } from '../../src/jobs/cleanup.job.js';
import { env } from '../../src/config/env.js';
vi.mock('../../src/config/env.js', () => ({
  env: {
    NEWS_CRON_SCHEDULE: '0 8 * * *',
    CLEANUP_CRON_SCHEDULE: '0 0 1 * *',
    DISCORD_GUILD_ID: 'guild',
  },
}));
vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn(() => true),
    schedule: vi.fn(() => ({ stop: vi.fn(), destroy: vi.fn() })),
  },
}));
vi.mock('../../src/jobs/news.job.js', () => ({ runNewsJob: vi.fn() }));
vi.mock('../../src/jobs/discovery.job.js', () => ({ runDiscoveryJob: vi.fn() }));
vi.mock('../../src/jobs/cleanup.job.js', () => ({ runDatabaseCleanup: vi.fn() }));
vi.mock('../../src/jobs/job-runner.js', () => ({ executeScheduledJob: vi.fn() }));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(executeScheduledJob).mockReset();
  vi.mocked(executeScheduledJob).mockResolvedValue(undefined);
  vi.mocked(cron.validate).mockReturnValue(true);
});
afterEach(stopScheduler);
describe('Scheduler lifecycle', () => {
  it('schedules both jobs in Europe/Paris with overlap prevention', () => {
    startScheduler();
    expect(cron.schedule).toHaveBeenCalledWith(env.NEWS_CRON_SCHEDULE, expect.any(Function), {
      timezone: 'Europe/Paris',
      noOverlap: true,
      name: 'news:all',
    });
    expect(cron.schedule).toHaveBeenCalledWith(env.CLEANUP_CRON_SCHEDULE, expect.any(Function), {
      timezone: 'Europe/Paris',
      noOverlap: true,
      name: 'database:cleanup',
    });
  });
  it('prevents duplicate startup', () => {
    startScheduler();
    expect(() => startScheduler()).toThrow('already running');
    expect(cron.schedule).toHaveBeenCalledTimes(2);
  });
  it.each(['NEWS', 'CLEANUP'])('rejects invalid %s cron before scheduling', (kind) => {
    vi.mocked(cron.validate).mockImplementation(
      (expression) =>
        expression !== (kind === 'NEWS' ? env.NEWS_CRON_SCHEDULE : env.CLEANUP_CRON_SCHEDULE),
    );
    expect(() => startScheduler()).toThrow(`Invalid ${kind}_CRON_SCHEDULE`);
    expect(cron.schedule).not.toHaveBeenCalled();
  });
  it('stops and destroys all tasks and permits restart', () => {
    startScheduler();
    const tasks = vi.mocked(cron.schedule).mock.results.map((result) => result.value);
    stopScheduler();
    for (const task of tasks) {
      expect(task.stop).toHaveBeenCalledOnce();
      expect(task.destroy).toHaveBeenCalledOnce();
    }
    startScheduler();
    expect(cron.schedule).toHaveBeenCalledTimes(4);
  });
  it('starts all categories independently even when one job cannot start', async () => {
    startScheduler();
    vi.mocked(executeScheduledJob)
      .mockRejectedValueOnce(new Error('Record unavailable'))
      .mockResolvedValue(undefined);
    const callback = vi.mocked(cron.schedule).mock.calls[0]?.[1];
    if (typeof callback !== 'function') throw new Error('Missing scheduled callback');
    callback({ date: new Date(), dateLocalIso: '2026-10-14T08:00:00', triggeredAt: new Date() });
    expect(executeScheduledJob).toHaveBeenCalledTimes(9);
    expect(vi.mocked(executeScheduledJob).mock.calls.map(([name]) => name)).toEqual([
      'news:CYBER',
      'news:IA',
      'news:OS',
      'news:HARDWARE',
      'news:DEVICES',
      'news:BUSINESS',
      'news:NEWS',
      'discovery:GITHUB',
      'discovery:PODCASTS',
    ]);
    const newsOperation = vi.mocked(executeScheduledJob).mock.calls[1]?.[1];
    const discoveryOperation = vi.mocked(executeScheduledJob).mock.calls[7]?.[1];
    if (!newsOperation || !discoveryOperation) throw new Error('Missing job operations');
    vi.mocked(runNewsJob).mockResolvedValue({
      category: 'IA',
      requested: 5,
      published: 4,
      failed: 1,
      remaining: 1,
    });
    vi.mocked(runDiscoveryJob).mockResolvedValue({
      category: 'GITHUB',
      fetched: 10,
      published: 5,
      failed: 0,
    });
    expect(await newsOperation()).toEqual({ fetched: 0, published: 4, failed: 1 });
    expect(await discoveryOperation()).toEqual({ fetched: 10, published: 5, failed: 0 });
  });
  it('runs cleanup through execution reporting', async () => {
    startScheduler();
    const callback = vi.mocked(cron.schedule).mock.calls[1]?.[1];
    if (typeof callback !== 'function') throw new Error('Missing cleanup callback');
    callback({ date: new Date(), dateLocalIso: '2026-10-01T00:00:00', triggeredAt: new Date() });
    const operation = vi.mocked(executeScheduledJob).mock.calls[0]?.[1];
    if (!operation) throw new Error('Missing cleanup operation');
    expect(await operation()).toEqual({ fetched: 0, published: 0, failed: 0 });
    expect(runDatabaseCleanup).toHaveBeenCalledOnce();
  });
});
