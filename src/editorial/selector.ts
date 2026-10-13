import { and, desc, eq, gte, notExists } from 'drizzle-orm';

import { db } from '../database/client.js';
import { articleCategories, articles, publications, sources } from '../database/schema/index.js';
import type { Category } from '../sources/categories.js';

import { calculateRelevance, isPromotionalContent } from './relevance.js';
import type { EditorialCandidate, RankedArticle } from './types.js';
import { groupEvents } from './events.js';
import { isSameEvent } from './similarity.js';

export async function selectArticles(
  category: Category,
  guildId: string,
  limit = 5,
): Promise<RankedArticle[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const alreadyPublished = db
    .select({ id: publications.id })
    .from(publications)
    .where(and(eq(publications.articleId, articles.id), eq(publications.guildId, guildId)));

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      description: articles.description,
      url: articles.url,
      publishedAt: articles.publishedAt,
      sourceId: articles.sourceId,
      sourceName: sources.name,
    })
    .from(articles)
    .innerJoin(articleCategories, eq(articleCategories.articleId, articles.id))
    .leftJoin(sources, eq(sources.id, articles.sourceId))
    .where(
      and(
        eq(articleCategories.category, category),
        eq(articles.isPublished, false),
        gte(articles.publishedAt, cutoff),
        notExists(alreadyPublished),
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(200);

  const candidates: EditorialCandidate[] = rows.map((row) => ({
    ...row,
    sourceName: row.sourceName ?? 'Unknown source',
    category,
  }));

  const ranked = candidates
    .filter((article) => !isPromotionalContent(article))
    .map((article) => ({
      ...article,
      score: calculateRelevance(article, now),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.publishedAt.getTime() - a.publishedAt.getTime() ||
        a.id.localeCompare(b.id),
    );

  const recentPublications = await db
    .select({
      title: articles.title,
    })
    .from(publications)
    .innerJoin(articles, eq(publications.articleId, articles.id))
    .where(
      and(
        eq(publications.guildId, guildId),
        gte(publications.publishedAt, new Date(now.getTime() - 72 * 60 * 60 * 1000)),
      ),
    );

  const events = groupEvents(ranked);

  const selected: RankedArticle[] = [];
  const sourceCounts = new Map<string, number>();

  for (const event of events) {
    if (selected.length >= limit) {
      break;
    }

    const article = event.representative;

    const alreadyCovered = recentPublications.some((publication) =>
      event.articles.some((candidate) => isSameEvent(candidate.title, publication.title)),
    );

    if (alreadyCovered) {
      continue;
    }

    const sourceKey = article.sourceId ?? article.sourceName;
    const sourceCount = sourceCounts.get(sourceKey) ?? 0;

    if (sourceCount >= 2) {
      continue;
    }

    selected.push(article);
    sourceCounts.set(sourceKey, sourceCount + 1);
  }

  return selected;
}
