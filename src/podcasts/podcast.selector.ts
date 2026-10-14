import type { PodcastEpisode } from './podcast.provider.js';

export function selectPodcastEpisodes(
  episodes: PodcastEpisode[],
  limit = 5,
  now = new Date(),
): PodcastEpisode[] {
  const cutoff = now.getTime() - 7 * 86_400_000;

  const recent = episodes
    .filter(
      (episode) =>
        episode.publishedAt.getTime() >= cutoff && episode.publishedAt.getTime() <= now.getTime(),
    )
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  const seen = new Set<string>();
  const grouped = new Map<string, PodcastEpisode[]>();

  for (const episode of recent) {
    const key = episode.guid || episode.url;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const list = grouped.get(episode.podcastName) ?? [];
    list.push(episode);
    grouped.set(episode.podcastName, list);
  }

  const selected: PodcastEpisode[] = [];

  while (selected.length < limit) {
    let added = false;

    for (const list of grouped.values()) {
      const episode = list.shift();

      if (!episode) {
        continue;
      }

      selected.push(episode);
      added = true;

      if (selected.length === limit) {
        break;
      }
    }

    if (!added) {
      break;
    }
  }

  return selected;
}
