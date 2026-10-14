import { eq } from 'drizzle-orm';

import { db } from '../database/client.js';
import { jobRuns } from '../database/schema/index.js';
import { logger } from '../shared/logger.js';

export interface JobResult {
  fetched: number;
  published: number;
  failed: number;
}

export async function executeScheduledJob(
  name: string,
  operation: () => Promise<JobResult>,
): Promise<void> {
  const [run] = await db
    .insert(jobRuns)
    .values({
      job: name,
      trigger: 'cron',
      status: 'running',
    })
    .returning({ id: jobRuns.id });

  if (!run) {
    throw new Error('Failed to create job execution record');
  }

  logger.info({ job: name, runId: run.id }, 'Scheduled job started');

  try {
    const result = await operation();

    const status = result.failed > 0 ? 'failed' : 'success';

    await db
      .update(jobRuns)
      .set({
        status,
        articlesFetched: result.fetched,
        articlesPublished: result.published,
        error: result.failed > 0 ? `${result.failed} item(s) failed` : null,
        finishedAt: new Date(),
      })
      .where(eq(jobRuns.id, run.id));

    logger.info({ job: name, runId: run.id, ...result, status }, 'Scheduled job completed');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    try {
      await db
        .update(jobRuns)
        .set({
          status: 'failed',
          error: message.slice(0, 2000),
          finishedAt: new Date(),
        })
        .where(eq(jobRuns.id, run.id));
    } catch (databaseError: unknown) {
      logger.error(
        { err: databaseError, job: name, runId: run.id },
        'Failed to update job execution record',
      );
    }

    logger.error({ err: error, job: name, runId: run.id }, 'Scheduled job failed');
  }
}
