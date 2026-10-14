import type { GitHubRepository } from './github.provider.js';

export interface RankedRepository extends GitHubRepository {
  score: number;
}

export function selectTrendingRepositories(
  repositories: GitHubRepository[],
  limit = 5,
  now = new Date(),
): RankedRepository[] {
  const ranked = repositories
    .filter((repository) => {
      const age = now.getTime() - repository.createdAt.getTime();
      const lastPush = now.getTime() - repository.pushedAt.getTime();

      return (
        age >= 0 &&
        age <= 8 * 86_400_000 &&
        lastPush >= 0 &&
        lastPush <= 3 * 86_400_000 &&
        Boolean(repository.description?.trim())
      );
    })
    .map((repository): RankedRepository => {
      const ageDays = Math.max(1, (now.getTime() - repository.createdAt.getTime()) / 86_400_000);

      const starsPerDay = repository.stars / ageDays;

      const activityBonus = repository.pushedAt.getTime() >= now.getTime() - 86_400_000 ? 15 : 0;

      return {
        ...repository,
        score: Math.round(
          Math.log10(1 + repository.stars) * 20 + Math.log10(1 + starsPerDay) * 30 + activityBonus,
        ),
      };
    })
    .sort((a, b) => b.score - a.score || b.stars - a.stars || a.fullName.localeCompare(b.fullName));

  const selected: RankedRepository[] = [];
  const seenOwners = new Set<string>();
  const seenRepositories = new Set<number>();

  for (const repository of ranked) {
    if (selected.length >= limit) {
      break;
    }

    const owner = repository.fullName.split('/')[0]?.toLowerCase();

    if (!owner || seenOwners.has(owner)) {
      continue;
    }

    if (seenRepositories.has(repository.id)) {
      continue;
    }

    selected.push(repository);
    seenOwners.add(owner);
    seenRepositories.add(repository.id);
  }

  return selected;
}
