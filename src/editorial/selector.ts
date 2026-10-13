import { and, desc, eq, gte, notExists } from 'drizzle-orm';

import { db } from '../database/client.js';
import { articleCategories, articles, publications, sources } from '../database/schema/index.js';
import type { Category } from '../sources/categories.js';

import { calculateRelevance, isPromotionalContent } from './relevance.js';
import { isSimilarTitle } from './similarity.js';
import type { EditorialCandidate, RankedArticle } from './types.js';

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

  const selected: RankedArticle[] = [];
  const sourceCounts = new Map<string, number>();

  for (const article of ranked) {
    if (selected.length >= limit) {
      break;
    }

    const sourceKey = article.sourceId ?? article.sourceName;
    const sourceCount = sourceCounts.get(sourceKey) ?? 0;

    // Prefer editorial diversity when enough sources are available.
    if (sourceCount >= 2) {
      continue;
    }

    if (selected.some((previous) => isSimilarTitle(previous.title, article.title))) {
      continue;
    }

    selected.push(article);
    sourceCounts.set(sourceKey, sourceCount + 1);
  }

  return selected;
}
