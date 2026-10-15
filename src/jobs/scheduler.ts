import cron, { type ScheduledTask } from 'node-cron';

import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

import { runDiscoveryJob } from './discovery.job.js';
import { executeScheduledJob } from './job-runner.js';
import { runNewsJob, type NewsCategory } from './news.job.js';
import { runDatabaseCleanup } from './cleanup.job.js';

const TIMEZONE = 'Europe/Paris';

const NEWS_CATEGORIES: NewsCategory[] = [
  'CYBER',
  'IA',
  'OS',
  'HARDWARE',
  'DEVICES',
  'BUSINESS',
  'NEWS',
];

const DISCOVERY_CATEGORIES = ['GITHUB', 'PODCASTS'] as const;

const tasks: ScheduledTask[] = [];

function schedule(expression: string, name: string, operation: () => Promise<void>): void {
  const task = cron.schedule(
    expression,
    () => {
      void operation().catch((error: unknown) => {
        logger.error({ err: error, job: name }, 'Unhandled scheduled task error');
      });
    },
    {
      timezone: TIMEZONE,
      noOverlap: true,
      name,
    },
  );

  tasks.push(task);
}

async function runDailyNewsJobs(): Promise<void> {
  for (const category of NEWS_CATEGORIES) {
    try {
      await executeScheduledJob(`news:${category}`, async () => {
        const result = await runNewsJob(category, env.DISCORD_GUILD_ID, 'daily');

        return {
          fetched: 0,
          published: result.published,
          failed: result.failed,
        };
      });
    } catch (error: unknown) {
      logger.error({ err: error, category }, 'Failed to execute scheduled news job');
    }
  }
}

async function runDailyDiscoveryJobs(): Promise<void> {
  const results = await Promise.allSettled(
    DISCOVERY_CATEGORIES.map((category) =>
      executeScheduledJob(`discovery:${category}`, async () => {
        const result = await runDiscoveryJob(category, env.DISCORD_GUILD_ID);

        return {
          fetched: result.fetched,
          published: result.published,
          failed: result.failed,
        };
      }),
    ),
  );

  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      logger.error(
        {
          err: result.reason,
          category: DISCOVERY_CATEGORIES[index],
        },
        'Failed to execute scheduled discovery job',
      );
    }
  }
}

async function runDailyJobs(): Promise<void> {
  await Promise.all([runDailyNewsJobs(), runDailyDiscoveryJobs()]);
}

export function startScheduler(): void {
  if (tasks.length > 0) {
    throw new Error('Scheduler is already running');
  }

  if (!cron.validate(env.NEWS_CRON_SCHEDULE)) {
    throw new Error('Invalid NEWS_CRON_SCHEDULE');
  }

  if (!cron.validate(env.CLEANUP_CRON_SCHEDULE)) {
    throw new Error('Invalid CLEANUP_CRON_SCHEDULE');
  }

  schedule(env.NEWS_CRON_SCHEDULE, 'news:all', runDailyJobs);

  schedule(env.CLEANUP_CRON_SCHEDULE, 'database:cleanup', () =>
    executeScheduledJob('database:cleanup', async () => {
      await runDatabaseCleanup();

      return {
        fetched: 0,
        published: 0,
        failed: 0,
      };
    }),
  );

  logger.info(
    {
      timezone: TIMEZONE,
      newsSchedule: env.NEWS_CRON_SCHEDULE,
      cleanupSchedule: env.CLEANUP_CRON_SCHEDULE,
      jobs: tasks.length,
    },
    'Scheduler started',
  );
}

export function stopScheduler(): void {
  for (const task of tasks) {
    void task.stop();
    void task.destroy();
  }

  tasks.length = 0;

  logger.info('Scheduler stopped');
}
