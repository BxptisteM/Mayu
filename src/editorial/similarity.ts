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
  'zero',
  'day',
  'exploited',
  'critical',
  'patched',
  'patch',
  'patches',
  'exploit',
  'exploits',
  'remote',
  'code',
  'execution',
  'access',
  'devices',
  'servers',
  'researchers',
  'discovered',
  'discloses',
  'disclosed',
]);

const SECURITY_EVENT_PATTERN =
  /\b(?:zero[- ]day|vulnerabilit(?:y|ies)|security flaw|exploit(?:ed|s|ing)?|attack(?:s|ers)?|breach|CVE-\d{4}-\d{4,})\b/i;

const CVE_PATTERN = /\bCVE-\d{4}-\d{4,}\b/gi;

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

function extractCves(title: string): Set<string> {
  return new Set([...title.matchAll(CVE_PATTERN)].map((match) => match[0].toUpperCase()));
}

function hasConflictingCves(first: string, second: string): boolean {
  const a = extractCves(first);
  const b = extractCves(second);

  if (a.size === 0 || b.size === 0) {
    return false;
  }

  return ![...a].some((cve) => b.has(cve));
}

function isSameSecurityIncident(first: string, second: string): boolean {
  if (!SECURITY_EVENT_PATTERN.test(first) || !SECURITY_EVENT_PATTERN.test(second)) {
    return false;
  }

  const a = tokenizeTitle(first);
  const b = tokenizeTitle(second);

  const sharedIdentifiers = [...a].filter(
    (word) => b.has(word) && !GENERIC_TERMS.has(word) && !/^\d+$/.test(word),
  );

  // The shared identifier is typically a vendor, product,
  // campaign or malware family name.
  if (sharedIdentifiers.length === 0) {
    return false;
  }

  const firstZeroDay = /\bzero[- ]day\b/i.test(first);
  const secondZeroDay = /\bzero[- ]day\b/i.test(second);

  if (firstZeroDay && secondZeroDay) {
    return true;
  }

  // Require more evidence when only one title says "zero-day".
  return sharedIdentifiers.length >= 2;
}

function hasConflictingSecuritySubjects(first: string, second: string): boolean {
  if (!SECURITY_EVENT_PATTERN.test(first) || !SECURITY_EVENT_PATTERN.test(second)) {
    return false;
  }

  const a = tokenizeTitle(first);
  const b = tokenizeTitle(second);

  const distinctiveA = [...a].filter((word) => !GENERIC_TERMS.has(word) && !/^\d+$/.test(word));

  const distinctiveB = [...b].filter((word) => !GENERIC_TERMS.has(word) && !/^\d+$/.test(word));

  if (distinctiveA.length === 0 || distinctiveB.length === 0) {
    return false;
  }

  return !distinctiveA.some((word) => distinctiveB.includes(word));
}

export function isSameEvent(first: string, second: string): boolean {
  if (hasConflictingCves(first, second)) {
    return false;
  }

  if (hasConflictingSecuritySubjects(first, second)) {
    return false;
  }

  const a = tokenizeTitle(first);
  const b = tokenizeTitle(second);

  if (a.size === 0 || b.size === 0) {
    return false;
  }

  const common = [...a].filter((word) => b.has(word));

  if (common.length < 2) {
    return false;
  }

  const distinctiveMatches = common.filter((word) => !GENERIC_TERMS.has(word));

  const overlap = common.length / Math.min(a.size, b.size);

  if (titleSimilarity(first, second) >= 0.6) {
    return true;
  }

  if (distinctiveMatches.length >= 2 && overlap >= 0.6) {
    return true;
  }

  return isSameSecurityIncident(first, second);
}
