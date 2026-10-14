import { describe, expect, it } from 'vitest';
import { selectTrendingRepositories } from '../../src/github/github.selector.js';
import type { GitHubRepository } from '../../src/github/github.provider.js';
const now = new Date('2026-10-14T12:00:00Z');
const repository: GitHubRepository = {
  id: 1,
  fullName: 'owner/project',
  url: 'https://github.com/owner/project',
  description: 'A useful project',
  stars: 100,
  forks: 10,
  language: 'TypeScript',
  createdAt: new Date('2026-10-13T12:00:00Z'),
  pushedAt: now,
};
describe('GitHub repository selection', () => {
  it('ranks popular projects and respects the selection limit', () => {
    const popular = { ...repository, id: 2, fullName: 'other/tool', stars: 1000 };
    expect(selectTrendingRepositories([repository, popular], 1, now)).toEqual([
      { ...popular, score: 165 },
    ]);
  });
  it('selects only one repository per owner regardless of case', () => {
    expect(
      selectTrendingRepositories(
        [repository, { ...repository, id: 2, fullName: 'OWNER/other' }],
        5,
        now,
      ),
    ).toHaveLength(1);
  });
  it('deduplicates repository identifiers across owners', () => {
    expect(
      selectTrendingRepositories(
        [repository, { ...repository, fullName: 'other/project' }],
        5,
        now,
      ),
    ).toHaveLength(1);
  });
  it.each([
    { description: null },
    { description: ' ' },
    { createdAt: new Date('2026-10-01') },
    { createdAt: new Date('2026-10-15') },
    { pushedAt: new Date('2026-10-10') },
    { pushedAt: new Date('invalid') },
    { fullName: '/project' },
  ])('excludes ineligible metadata %j', (changes) => {
    expect(selectTrendingRepositories([{ ...repository, ...changes }], 5, now)).toEqual([]);
  });
  it('handles empty candidates and zero limits', () => {
    expect(selectTrendingRepositories([], 5, now)).toEqual([]);
    expect(selectTrendingRepositories([repository], 0, now)).toEqual([]);
  });
});
