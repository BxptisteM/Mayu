import { isSameEvent } from './similarity.js';
import type { RankedArticle } from './types.js';

export interface EditorialEvent {
  representative: RankedArticle;
  articles: RankedArticle[];
  sourceCount: number;
  score: number;
}

export function groupEvents(rankedArticles: RankedArticle[]): EditorialEvent[] {
  const events: EditorialEvent[] = [];

  for (const article of rankedArticles) {
    const existing = events.find((event) =>
      event.articles.some((candidate) => isSameEvent(candidate.title, article.title)),
    );

    if (existing) {
      existing.articles.push(article);
      continue;
    }

    events.push({
      representative: article,
      articles: [article],
      sourceCount: 1,
      score: article.score,
    });
  }

  for (const event of events) {
    const distinctSources = new Set(
      event.articles.map((article) => article.sourceId ?? article.sourceName),
    );

    event.sourceCount = distinctSources.size;

    event.representative = [...event.articles].sort(
      (a, b) => b.score - a.score || b.publishedAt.getTime() - a.publishedAt.getTime(),
    )[0]!;

    const corroborationBonus = Math.min(15, (event.sourceCount - 1) * 5);

    event.score = Math.min(100, event.representative.score + corroborationBonus);
  }

  return events.sort(
    (a, b) =>
      b.score - a.score ||
      b.representative.publishedAt.getTime() - a.representative.publishedAt.getTime(),
  );
}
