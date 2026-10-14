import 'dotenv/config';

import { fetchTrendingRepositories } from '../github/github.provider.js';
import { selectTrendingRepositories } from '../github/github.selector.js';
import { fetchPodcastEpisodes } from '../podcasts/podcast.provider.js';
import { selectPodcastEpisodes } from '../podcasts/podcast.selector.js';
import { logger } from '../shared/logger.js';

async function main(): Promise<void> {
  const mode = process.argv[2];

  if (mode === 'github') {
    const repositories = await fetchTrendingRepositories();
    const selected = selectTrendingRepositories(repositories, 5);

    logger.info(
      {
        fetched: repositories.length,
        selected: selected.map((repository) => ({
          name: repository.fullName,
          url: repository.url,
          stars: repository.stars,
          forks: repository.forks,
          language: repository.language,
          score: repository.score,
        })),
      },
      'GitHub discovery preview completed',
    );

    return;
  }

  if (mode === 'podcasts') {
    const episodes = await fetchPodcastEpisodes();
    const selected = selectPodcastEpisodes(episodes, 5);

    logger.info(
      {
        fetched: episodes.length,
        selected: selected.map((episode) => ({
          podcast: episode.podcastName,
          title: episode.title,
          publishedAt: episode.publishedAt.toISOString(),
          url: episode.url,
        })),
      },
      'Podcast discovery preview completed',
    );

    return;
  }

  throw new Error('Expected discovery mode: github or podcasts');
}

main().catch((error: unknown) => {
  logger.error({ err: error }, 'Discovery preview failed');
  process.exitCode = 1;
});
