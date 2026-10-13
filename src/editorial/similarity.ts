const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'after',
  'before',
  'about',
  'this',
  'that',
  'has',
  'have',
  'will',
  'are',
  'was',
  'were',
  'new',
  'latest',
  'more',
  'than',
  'how',
  'why',
  'what',
  'can',
  'says',
  'said',
  'report',
  'reports',
  'reportedly',
  'reveals',
  'revealed',
  'announces',
  'announced',
  'launches',
  'launched',
  'updates',
  'updated',
]);

const GENERIC_TERMS = new Set([
  'security',
  'software',
  'technology',
  'tech',
  'company',
  'companies',
  'users',
  'system',
  'systems',
  'attack',
  'attacks',
  'hackers',
  'vulnerability',
  'vulnerabilities',
  'flaw',
  'flaws',
  'update',
  'release',
  'feature',
  'features',
  'model',
  'models',
  'data',
  'artificial',
  'intelligence',
]);

export function tokenizeTitle(title: string): Set<string> {
  const normalized = title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '');

  return new Set(
    (normalized.match(/[a-z0-9]+/g) ?? [])
      .filter((word) => word.length >= 3)
      .filter((word) => !STOP_WORDS.has(word)),
  );
}

export function titleSimilarity(first: string, second: string): number {
  const a = tokenizeTitle(first);
  const b = tokenizeTitle(second);

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  const common = [...a].filter((word) => b.has(word));
  const unionSize = new Set([...a, ...b]).size;

  return common.length / unionSize;
}

export function isSameEvent(first: string, second: string): boolean {
  const a = tokenizeTitle(first);
  const b = tokenizeTitle(second);

  const common = [...a].filter((word) => b.has(word));

  if (common.length < 2) {
    return false;
  }

  const distinctiveMatches = common.filter((word) => !GENERIC_TERMS.has(word));

  const overlap = common.length / Math.min(a.size, b.size);

  return (
    titleSimilarity(first, second) >= 0.6 || (distinctiveMatches.length >= 2 && overlap >= 0.6)
  );
}
