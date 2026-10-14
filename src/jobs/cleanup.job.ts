import { and, eq, lt, notExists, sql } from 'drizzle-orm';

import { db } from '../database/client.js';
import {
  articles,
  githubSnapshots,
  jobRuns,
  podcastEpisodes,
  selections,
} from '../database/schema/index.js';
import { logger } from '../shared/logger.js';

const DAY_MS = 86_400_000;

export interface CleanupResult {
  articlesDeleted: number;
  episodesDeleted: number;
  snapshotsDeleted: number;
  jobRunsDeleted: number;
}

export async function runDatabaseCleanup(now = new Date()): Promise<CleanupResult> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS);

  return db.transaction(async (tx) => {
    const articleSelectionExists = tx
      .select({ id: selections.id })
      .from(selections)
      .where(eq(selections.articleId, articles.id));

    const articlesDeleted = await tx
      .delete(articles)
      .where(and(lt(articles.fetchedAt, thirtyDaysAgo), notExists(articleSelectionExists)))
      .returning({ id: articles.id });

    const episodesDeleted = await tx
      .delete(podcastEpisodes)
      .where(lt(podcastEpisodes.publishedAt, thirtyDaysAgo))
      .returning({ id: podcastEpisodes.id });

    const snapshotsDeleted = await tx
      .delete(githubSnapshots)
      .where(lt(githubSnapshots.capturedAt, thirtyDaysAgo))
      .returning({ id: githubSnapshots.id });

    const jobRunsDeleted = await tx
      .delete(jobRuns)
      .where(and(lt(jobRuns.startedAt, ninetyDaysAgo), sql`${jobRuns.status} <> 'running'`))
      .returning({ id: jobRuns.id });

    const result: CleanupResult = {
      articlesDeleted: articlesDeleted.length,
      episodesDeleted: episodesDeleted.length,
      snapshotsDeleted: snapshotsDeleted.length,
      jobRunsDeleted: jobRunsDeleted.length,
    };

    logger.info(result, 'Database cleanup completed');

    return result;
  });
}
