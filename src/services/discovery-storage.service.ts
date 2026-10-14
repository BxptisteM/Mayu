import { createHash } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { db } from '../database/client.js';
import {
  discoveryPublications,
  githubRepositories,
  githubSnapshots,
  podcastEpisodes,
} from '../database/schema/index.js';

import type { GitHubRepository } from '../github/github.provider.js';
import type { PodcastEpisode } from '../podcasts/podcast.provider.js';

export type DiscoveryCategory = 'GITHUB' | 'PODCASTS';

export function podcastEpisodeKey(feedUrl: string, guid: string): string {
  return createHash('sha256').update(`${feedUrl}\0${guid}`).digest('hex');
}

export async function saveRepositories(repositories: GitHubRepository[]): Promise<void> {
  const capturedAt = new Date();

  await db.transaction(async (tx) => {
    for (const repo of repositories) {
      await tx
        .insert(githubRepositories)
        .values({
          githubId: repo.id,
          fullName: repo.fullName,
          url: repo.url,
          description: repo.description,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          createdAt: repo.createdAt,
          pushedAt: repo.pushedAt,
        })
        .onConflictDoUpdate({
          target: githubRepositories.githubId,
          set: {
            fullName: repo.fullName,
            url: repo.url,
            description: repo.description,
            language: repo.language,
            stars: repo.stars,
            forks: repo.forks,
            pushedAt: repo.pushedAt,
            updatedAt: capturedAt,
          },
        });

      await tx.insert(githubSnapshots).values({
        githubId: repo.id,
        stars: repo.stars,
        capturedAt,
      });
    }
  });
}

export interface StoredPodcastEpisode extends PodcastEpisode {
  id: string;
}

export async function savePodcastEpisodes(episodes: StoredPodcastEpisode[]): Promise<void> {
  if (episodes.length === 0) {
    return;
  }

  await db
    .insert(podcastEpisodes)
    .values(
      episodes.map((episode) => ({
        id: episode.id,
        podcastName: episode.podcastName,
        guid: episode.guid,
        title: episode.title,
        url: episode.url,
        description: episode.description,
        publishedAt: episode.publishedAt,
      })),
    )
    .onConflictDoNothing();
}

export async function isDiscoveryPublished(
  guildId: string,
  category: DiscoveryCategory,
  itemKey: string,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: discoveryPublications.id })
    .from(discoveryPublications)
    .where(
      and(
        eq(discoveryPublications.guildId, guildId),
        eq(discoveryPublications.category, category),
        eq(discoveryPublications.itemKey, itemKey),
      ),
    )
    .limit(1);

  return Boolean(existing);
}
