import cron, { type ScheduledTask } from 'node-cron';

import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

import { runNewsJob, type NewsCategory } from './news.job.js';
import { runDiscoveryJob } from './discovery.job.js';
import { executeScheduledJob } from './job-runner.js';
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

const tasks: ScheduledTask[] = [];

function schedule(
  expression: string,
  name: string,
  operation: () => Promise<void>,
): void {
  const task = cron.schedule(
    expression,
    () => {
      void operation().catch((error: unknown) => {
        logger.error(
          { err: error, job: name },
          'Unhandled scheduled task error',
        );
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

  // All news jobs share the same schedule.
  schedule(
    env.NEWS_CRON_SCHEDULE,
    'news:all',
    async () => {
      const results = await Promise.allSettled([
        ...NEWS_CATEGORIES.map((category) =>
          executeScheduledJob(
            `news:${category}`,
            async () => {
              const result = await runNewsJob(
                category,
                env.DISCORD_GUILD_ID,
                'daily',
              );

              return {
                fetched: 0,
                published: result.published,
                failed: result.failed,
              };
            },
          ),
        ),
        ...(['GITHUB', 'PODCASTS'] as const).map(
          (category) =>
            executeScheduledJob(
              `discovery:${category}`,
              async () => {
                const result = await runDiscoveryJob(
                  category,
                  env.DISCORD_GUILD_ID,
                );

                return {
                  fetched: result.fetched,
                  published: result.published,
                  failed: result.failed,
                };
              },
            ),
        ),
      ]);

      const rejected = results.filter(
        (result) => result.status === 'rejected',
      );

      if (rejected.length > 0) {
        logger.error(
          {
            rejected: rejected.length,
            total: results.length,
          },
          'Some scheduled jobs could not be started',
        );
      }
    },
  );

  // Monthly database cleanup.
  schedule(
    env.CLEANUP_CRON_SCHEDULE,
    'database:cleanup',
    () =>
      executeScheduledJob(
        'database:cleanup',
        async () => {
          await runDatabaseCleanup();

          return {
            fetched: 0,
            published: 0,
            failed: 0,
          };
        },
      ),
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
