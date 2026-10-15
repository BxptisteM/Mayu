import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import cron from 'node-cron';

import { env } from '../../src/config/env.js';
import { runDatabaseCleanup } from '../../src/jobs/cleanup.job.js';
import { runDiscoveryJob } from '../../src/jobs/discovery.job.js';
import { executeScheduledJob } from '../../src/jobs/job-runner.js';
import { runNewsJob } from '../../src/jobs/news.job.js';
import { startScheduler, stopScheduler } from '../../src/jobs/scheduler.js';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NEWS_CRON_SCHEDULE: '0 8 * * *',
    CLEANUP_CRON_SCHEDULE: '0 3 1 * *',
    DISCORD_GUILD_ID: 'guild',
  },
}));

vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn(() => true),
    schedule: vi.fn(() => ({
      stop: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}));

vi.mock('../../src/jobs/news.job.js', () => ({
  runNewsJob: vi.fn(),
}));

vi.mock('../../src/jobs/discovery.job.js', () => ({
  runDiscoveryJob: vi.fn(),
}));

vi.mock('../../src/jobs/cleanup.job.js', () => ({
  runDatabaseCleanup: vi.fn(),
}));

vi.mock('../../src/jobs/job-runner.js', () => ({
  executeScheduledJob: vi.fn(),
}));

vi.mock('../../src/shared/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

function triggerScheduledJob(index: number): void {
  const callback = vi.mocked(cron.schedule).mock.calls[index]?.[1];

  if (typeof callback !== 'function') {
    throw new Error('Scheduled callback not found');
  }

  callback({
    date: new Date(),
    dateLocalIso: '2026-10-15T08:00:00',
    triggeredAt: new Date(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(cron.validate).mockReturnValue(true);
  vi.mocked(executeScheduledJob).mockReset();
  vi.mocked(executeScheduledJob).mockImplementation(async (_name, operation) => {
    await operation();
  });

  vi.mocked(runNewsJob).mockImplementation(async (category) => ({
    category,
    requested: 5,
    published: 5,
    failed: 0,
    remaining: 0,
  }));

  vi.mocked(runDiscoveryJob).mockImplementation(async (category) => ({
    category,
    fetched: 10,
    published: 5,
    failed: 0,
  }));

  vi.mocked(runDatabaseCleanup).mockResolvedValue(undefined as never);
});

afterEach(() => {
  stopScheduler();
});

describe('Scheduler lifecycle', () => {
  it('schedules news and cleanup in Europe/Paris', () => {
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

    expect(() => startScheduler()).toThrow('Scheduler is already running');

    expect(cron.schedule).toHaveBeenCalledTimes(2);
  });

  it.each(['NEWS', 'CLEANUP'])('rejects an invalid %s schedule', (kind) => {
    vi.mocked(cron.validate).mockImplementation(
      (expression) =>
        expression !== (kind === 'NEWS' ? env.NEWS_CRON_SCHEDULE : env.CLEANUP_CRON_SCHEDULE),
    );

    expect(() => startScheduler()).toThrow(`Invalid ${kind}_CRON_SCHEDULE`);

    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('stops all scheduled tasks and permits restart', () => {
    startScheduler();

    const scheduledTasks = vi.mocked(cron.schedule).mock.results.map((result) => result.value);

    stopScheduler();

    for (const task of scheduledTasks) {
      expect(task.stop).toHaveBeenCalledOnce();
      expect(task.destroy).toHaveBeenCalledOnce();
    }

    startScheduler();

    expect(cron.schedule).toHaveBeenCalledTimes(4);
  });

  it('runs all seven news categories sequentially', async () => {
    const completedCategories: string[] = [];
    let activeNewsJobs = 0;
    let maximumActiveNewsJobs = 0;

    vi.mocked(runNewsJob).mockImplementation(async (category) => {
      activeNewsJobs++;
      maximumActiveNewsJobs = Math.max(maximumActiveNewsJobs, activeNewsJobs);

      await Promise.resolve();

      completedCategories.push(category);
      activeNewsJobs--;

      return {
        category,
        requested: 5,
        published: 5,
        failed: 0,
        remaining: 0,
      };
    });

    startScheduler();
    triggerScheduledJob(0);

    await vi.waitFor(() => {
      expect(completedCategories).toHaveLength(7);
    });

    expect(completedCategories).toEqual([
      'CYBER',
      'IA',
      'OS',
      'HARDWARE',
      'DEVICES',
      'BUSINESS',
      'NEWS',
    ]);

    expect(maximumActiveNewsJobs).toBe(1);
  });

  it('starts GitHub and podcast discovery independently', async () => {
    startScheduler();
    triggerScheduledJob(0);

    await vi.waitFor(() => {
      expect(runDiscoveryJob).toHaveBeenCalledTimes(2);
      expect(runNewsJob).toHaveBeenCalledTimes(7);
    });

    expect(runDiscoveryJob).toHaveBeenCalledWith('GITHUB', 'guild');

    expect(runDiscoveryJob).toHaveBeenCalledWith('PODCASTS', 'guild');

    const names = vi.mocked(executeScheduledJob).mock.calls.map(([name]) => name);

    expect(names).toContain('discovery:GITHUB');
    expect(names).toContain('discovery:PODCASTS');
    expect(names).toContain('news:NEWS');
  });

  it('continues with the next news category after a failure', async () => {
    vi.mocked(executeScheduledJob).mockImplementation(async (name, operation) => {
      if (name === 'news:IA') {
        throw new Error('Job record unavailable');
      }

      await operation();
    });

    startScheduler();
    triggerScheduledJob(0);

    await vi.waitFor(() => {
      expect(runNewsJob).toHaveBeenCalledWith('NEWS', 'guild', 'daily');
    });

    expect(runNewsJob).not.toHaveBeenCalledWith('IA', 'guild', 'daily');

    expect(runNewsJob).toHaveBeenCalledTimes(6);
  });

  it('runs monthly cleanup through execution reporting', async () => {
    startScheduler();
    triggerScheduledJob(1);

    await vi.waitFor(() => {
      expect(runDatabaseCleanup).toHaveBeenCalledOnce();
    });

    expect(executeScheduledJob).toHaveBeenCalledWith('database:cleanup', expect.any(Function));
  });
});
