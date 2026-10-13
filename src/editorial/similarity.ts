const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'with',
  'from',
  'into',
  'after',
  'before',
  'about',
  'new',
  'latest',
  'how',
  'why',
  'what',
  'this',
  'that',
  'are',
  'has',
  'have',
  'its',
  'dans',
  'avec',
  'pour',
  'une',
  'des',
  'les',
  'sur',
  'est',
]);

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
  );
}

export function titleSimilarity(first: string, second: string): number {
  const a = tokenize(first);
  const b = tokenize(second);

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  const intersection = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;

  return intersection / union;
}

export function isSimilarTitle(first: string, second: string): boolean {
  return titleSimilarity(first, second) >= 0.65;
}
