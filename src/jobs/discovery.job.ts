import { and, eq, gte, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../database/client.js';
import { discoveryPublications } from '../database/schema/index.js';
import { buildGitHubEmbed, buildPodcastEmbed } from '../discord/embeds/discovery.embed.js';
import { fetchTrendingRepositories } from '../github/github.provider.js';
import { selectTrendingRepositories } from '../github/github.selector.js';
import { fetchPodcastEpisodes } from '../podcasts/podcast.provider.js';
import { selectPodcastEpisodes } from '../podcasts/podcast.selector.js';
import { logger } from '../shared/logger.js';
import {
  podcastEpisodeKey,
  savePodcastEpisodes,
  saveRepositories,
  type DiscoveryCategory,
} from '../services/discovery-storage.service.js';
import { publishDiscoveryItem } from '../services/discovery-publication.service.js';

export interface DiscoveryJobResult {
  category: DiscoveryCategory;
  fetched: number;
  published: number;
  failed: number;
}

const activeJobs = new Set<string>();

async function remainingDailySlots(guildId: string, category: DiscoveryCategory): Promise<number> {
  const now = new Date();

  // Initial UTC-day quota; align with Europe/Paris
  // when the shared scheduler is implemented.
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(discoveryPublications)
    .where(
      and(
        eq(discoveryPublications.guildId, guildId),
        eq(discoveryPublications.category, category),
        gte(discoveryPublications.publishedAt, start),
      ),
    );

  return Math.max(0, env.ARTICLES_DAILY_PUBLISH_LIMIT - (result?.count ?? 0));
}

export async function runDiscoveryJob(
  category: DiscoveryCategory,
  guildId: string,
): Promise<DiscoveryJobResult> {
  const jobKey = `${guildId}:${category}`;

  if (activeJobs.has(jobKey)) {
    throw new Error(`${category} discovery job is already running`);
  }

  activeJobs.add(jobKey);

  const result: DiscoveryJobResult = {
    category,
    fetched: 0,
    published: 0,
    failed: 0,
  };

  try {
    const limit = await remainingDailySlots(guildId, category);

    if (limit === 0) {
      return result;
    }

    if (category === 'GITHUB') {
      const repositories = await fetchTrendingRepositories();

      result.fetched = repositories.length;

      // Observe all fetched repositories to build future star history.
      await saveRepositories(repositories);

      // Select extra candidates because some may already be published.
      const selected = selectTrendingRepositories(repositories, 10);

      for (const repository of selected) {
        if (result.published >= limit) {
          break;
        }

        try {
          const published = await publishDiscoveryItem(
            guildId,
            category,
            String(repository.id),
            buildGitHubEmbed(repository),
          );

          if (published) {
            result.published++;
          }
        } catch (error: unknown) {
          result.failed++;

          logger.error(
            { err: error, repository: repository.fullName },
            'GitHub publication failed',
          );
        }
      }
    } else {
      const episodes = await fetchPodcastEpisodes();

      result.fetched = episodes.length;

      const stored = episodes.map((episode) => ({
        ...episode,
        id: podcastEpisodeKey(episode.feedUrl, episode.guid),
      }));

      await savePodcastEpisodes(stored);

      const selected = selectPodcastEpisodes(episodes, 10);

      for (const episode of selected) {
        if (result.published >= limit) {
          break;
        }

        try {
          const key = podcastEpisodeKey(episode.feedUrl, episode.guid);

          const published = await publishDiscoveryItem(
            guildId,
            category,
            key,
            buildPodcastEmbed(episode),
          );

          if (published) {
            result.published++;
          }
        } catch (error: unknown) {
          result.failed++;

          logger.error({ err: error, episode: episode.title }, 'Podcast publication failed');
        }
      }
    }

    logger.info(result, 'Discovery job completed');

    return result;
  } finally {
    activeJobs.delete(jobKey);
  }
}
