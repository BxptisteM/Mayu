import { and, arrayContains, eq, gte, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../database/client.js';
import { articleCategories, articles, sources } from '../database/schema/index.js';
import { logger } from '../shared/logger.js';

import type { Category } from './categories.js';
import { mapConcurrent } from './concurrency.js';
import { isEditorialArticle, rankCandidates } from './editorial-filter.js';
import { fetchRssArticles, type CollectedArticle } from './rss.provider.js';

interface Candidate extends CollectedArticle {
  sourceId: string;
  sourceName: string;
}

export interface CollectionResult {
  category: Category;
  sourcesProcessed: number;
  sourcesFailed: number;
  articlesFetched: number;
  articlesInserted: number;
}

function selectDiverseCandidates(candidates: Candidate[], limit: number): Candidate[] {
  const grouped = new Map<string, Candidate[]>();

  for (const candidate of rankCandidates(candidates)) {
    const group = grouped.get(candidate.sourceId) ?? [];
    group.push(candidate);
    grouped.set(candidate.sourceId, group);
  }

  const selected: Candidate[] = [];
  const seenUrls = new Set<string>();

  while (selected.length < limit) {
    let added = false;

    for (const group of grouped.values()) {
      const candidate = group.shift();

      if (!candidate) {
        continue;
      }

      if (seenUrls.has(candidate.url)) {
        continue;
      }

      selected.push(candidate);
      seenUrls.add(candidate.url);
      added = true;

      if (selected.length >= limit) {
        break;
      }
    }

    if (!added) {
      break;
    }
  }

  return selected;
}

export async function collectArticles(
  category: Category,
  lookbackHours = env.ARTICLES_LOOKBACK_HOURS,
): Promise<CollectionResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);

  const activeSources = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.enabled, true),
        eq(sources.type, 'rss'),
        arrayContains(sources.tags, [category]),
      ),
    );

  const result: CollectionResult = {
    category,
    sourcesProcessed: 0,
    sourcesFailed: 0,
    articlesFetched: 0,
    articlesInserted: 0,
  };

  const batches = await mapConcurrent(
    activeSources,
    env.SOURCES_MAX_CONCURRENCY,
    async (source): Promise<Candidate[]> => {
      try {
        const fetched = await fetchRssArticles(source.url);

        result.sourcesProcessed++;
        result.articlesFetched += fetched.length;

        const recent = rankCandidates(
          fetched.filter(
            (article) =>
              article.publishedAt >= cutoff &&
              article.publishedAt <= now &&
              isEditorialArticle(article),
          ),
        ).slice(0, env.ARTICLES_MAX_PER_SOURCE);

        logger.debug(
          {
            source: source.name,
            fetched: fetched.length,
            candidates: recent.length,
          },
          'RSS source processed',
        );

        return recent.map((article) => ({
          ...article,
          sourceId: source.id,
          sourceName: source.name,
        }));
      } catch (error: unknown) {
        result.sourcesFailed++;

        logger.warn(
          {
            err: error,
            sourceId: source.id,
            sourceName: source.name,
          },
          'RSS source collection failed',
        );

        return [];
      }
    },
  );

  const candidates = batches.flat();

  // Daily quota is based on UTC calendar days.
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);

  await db.transaction(async (tx) => {
    // Serialize collectors competing for the same category.
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtext(${`mayu:collection:${category}`})
      )
    `);

    const [{ count: existingCount } = { count: 0 }] = await tx
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(articleCategories)
      .where(
        and(eq(articleCategories.category, category), gte(articleCategories.createdAt, dayStart)),
      );

    const remaining = Math.max(0, env.ARTICLES_MAX_PER_CATEGORY - existingCount);

    const selected = selectDiverseCandidates(candidates, remaining);

    for (const candidate of selected) {
      const inserted = await tx
        .insert(articles)
        .values({
          sourceId: candidate.sourceId,
          title: candidate.title,
          url: candidate.url,
          description: candidate.description,
          publishedAt: candidate.publishedAt,
        })
        .onConflictDoNothing({ target: articles.url })
        .returning({ id: articles.id });

      let articleId = inserted[0]?.id;

      if (!articleId) {
        const [existing] = await tx
          .select({ id: articles.id })
          .from(articles)
          .where(eq(articles.url, candidate.url))
          .limit(1);

        articleId = existing?.id;
      }

      if (!articleId) {
        continue;
      }

      await tx
        .insert(articleCategories)
        .values({
          articleId,
          category,
        })
        .onConflictDoNothing();

      result.articlesInserted += inserted.length;
    }
  });

  logger.info(
    {
      ...result,
      candidates: candidates.length,
    },
    'Article collection completed',
  );

  return result;
}
