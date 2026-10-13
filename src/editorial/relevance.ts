import type { EditorialCandidate } from './types.js';

const PROMOTIONAL_PATTERNS = [
  /\bwebinar\b/i,
  /\bsponsored\b/i,
  /\bregister now\b/i,
  /\bproduct walkthrough\b/i,
  /\bfree trial\b/i,
  /\baffiliate\b/i,
  /\bdiscount\b/i,
];

const IMPORTANCE_PATTERNS: Record<string, RegExp[]> = {
  CYBER: [
    /\bzero.day\b/i,
    /\bactively exploited\b/i,
    /\bcritical vulnerability\b/i,
    /\bdata breach\b/i,
    /\bransomware\b/i,
    /\bCVE-\d{4}-\d{4,}\b/i,
  ],
  IA: [
    /\bnew model\b/i,
    /\bmodel release\b/i,
    /\bopen.source\b/i,
    /\bresearch breakthrough\b/i,
    /\bbenchmark\b/i,
  ],
  OS: [
    /\bsecurity update\b/i,
    /\bkernel\b/i,
    /\brelease candidate\b/i,
    /\bnew release\b/i,
    /\bmajor update\b/i,
  ],
  HARDWARE: [
    /\bnew GPU\b/i,
    /\bnew CPU\b/i,
    /\bchip launch\b/i,
    /\barchitecture\b/i,
    /\bperformance\b/i,
  ],
  NEWS: [/\blaunches\b/i, /\breleases\b/i, /\bopen.source\b/i, /\bsecurity\b/i, /\bcloud\b/i],
  GITHUB: [],
};

export function isPromotionalContent(article: EditorialCandidate): boolean {
  return PROMOTIONAL_PATTERNS.some((pattern) => pattern.test(article.title));
}

export function calculateRelevance(article: EditorialCandidate, now = new Date()): number {
  const ageHours = Math.max(0, (now.getTime() - article.publishedAt.getTime()) / 3_600_000);

  const freshness = Math.max(0, 40 * (1 - ageHours / 24));

  const patterns = IMPORTANCE_PATTERNS[article.category] ?? [];
  const matchingSignals = patterns.filter((pattern) =>
    pattern.test(`${article.title} ${article.description ?? ''}`),
  ).length;

  const importance = Math.min(45, matchingSignals * 15);

  const descriptionQuality = article.description
    ? Math.min(15, article.description.length / 20)
    : 0;

  return Math.round(freshness + importance + descriptionQuality);
}
