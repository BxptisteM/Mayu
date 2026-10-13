import type { CollectedArticle } from './rss.provider.js';

const EXCLUDED_PATTERNS = [
  /\bwebinar\b/i,
  /\bsponsored\b/i,
  /\bproduct walkthrough\b/i,
  /\bregister now\b/i,
  /\bfree trial\b/i,
  /\bdiscount code\b/i,
  /\bpromotional offer\b/i,
  /\baffiliate deal\b/i,
  /\bjoin our event\b/i,
];

export function isEditorialArticle(article: CollectedArticle): boolean {
  return !EXCLUDED_PATTERNS.some((pattern) => pattern.test(article.title));
}

export function rankCandidates<T extends CollectedArticle>(articles: T[]): T[] {
  return [...articles].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
