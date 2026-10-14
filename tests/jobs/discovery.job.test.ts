import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDiscoveryJob } from '../../src/jobs/discovery.job.js';
import { fetchTrendingRepositories } from '../../src/github/github.provider.js';
import { fetchPodcastEpisodes } from '../../src/podcasts/podcast.provider.js';
import {
  saveRepositories,
  savePodcastEpisodes,
} from '../../src/services/discovery-storage.service.js';
import { publishDiscoveryItem } from '../../src/services/discovery-publication.service.js';
import { resetDatabase, rows } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/config/env.js', () => ({ env: { ARTICLES_DAILY_PUBLISH_LIMIT: 2 } }));
vi.mock('../../src/github/github.provider.js', () => ({ fetchTrendingRepositories: vi.fn() }));
vi.mock('../../src/podcasts/podcast.provider.js', () => ({ fetchPodcastEpisodes: vi.fn() }));
vi.mock('../../src/services/discovery-storage.service.js', () => ({
  saveRepositories: vi.fn(),
  savePodcastEpisodes: vi.fn(),
  podcastEpisodeKey: (feed: string, guid: string) => `${feed}:${guid}`,
}));
vi.mock('../../src/services/discovery-publication.service.js', () => ({
  publishDiscoveryItem: vi.fn(),
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
const now = new Date('2026-10-14T12:00:00Z');
const repository = {
  id: 1,
  fullName: 'owner/project',
  url: 'https://github.com/owner/project',
  description: 'Useful project',
  stars: 100,
  forks: 10,
  language: null,
  createdAt: now,
  pushedAt: now,
};
const episode = {
  podcastName: 'Tech',
  guid: 'episode',
  title: 'Episode',
  url: 'https://example.com/episode',
  description: '',
  feedUrl: 'https://example.com/rss',
  publishedAt: now,
};
beforeEach(() => {
  resetDatabase();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.mocked(fetchTrendingRepositories).mockResolvedValue([repository]);
  vi.mocked(fetchPodcastEpisodes).mockResolvedValue([episode]);
  vi.mocked(publishDiscoveryItem).mockResolvedValue(true);
});
afterEach(() => vi.useRealTimers());
describe('Discovery publication jobs', () => {
  it('stores observed repositories and publishes selected candidates', async () => {
    rows.push([{ count: 0 }]);
    expect(await runDiscoveryJob('GITHUB', 'guild')).toEqual({
      category: 'GITHUB',
      fetched: 1,
      published: 1,
      failed: 0,
    });
    expect(saveRepositories).toHaveBeenCalledWith([repository]);
    expect(publishDiscoveryItem).toHaveBeenCalledWith('guild', 'GITHUB', '1', expect.anything());
  });
  it('stores podcast episodes using deterministic publication identities', async () => {
    rows.push([{ count: 0 }]);
    expect(await runDiscoveryJob('PODCASTS', 'guild')).toEqual({
      category: 'PODCASTS',
      fetched: 1,
      published: 1,
      failed: 0,
    });
    expect(savePodcastEpisodes).toHaveBeenCalledWith([
      { ...episode, id: 'https://example.com/rss:episode' },
    ]);
  });
  it('does not fetch when the daily quota is exhausted', async () => {
    rows.push([{ count: 2 }]);
    expect(await runDiscoveryJob('GITHUB', 'guild')).toMatchObject({ fetched: 0, published: 0 });
    expect(fetchTrendingRepositories).not.toHaveBeenCalled();
  });
  it('skips previously published items without consuming a slot', async () => {
    rows.push([{ count: 1 }]);
    vi.mocked(fetchTrendingRepositories).mockResolvedValue([
      repository,
      { ...repository, id: 2, fullName: 'other/tool' },
    ]);
    vi.mocked(publishDiscoveryItem).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await runDiscoveryJob('GITHUB', 'guild')).toMatchObject({ published: 1, failed: 0 });
    expect(publishDiscoveryItem).toHaveBeenCalledTimes(2);
  });
  it('continues publishing after an individual failure', async () => {
    rows.push([{ count: 0 }]);
    vi.mocked(fetchTrendingRepositories).mockResolvedValue([
      repository,
      { ...repository, id: 2, fullName: 'other/tool' },
    ]);
    vi.mocked(publishDiscoveryItem).mockRejectedValueOnce(new Error('Send failed'));
    expect(await runDiscoveryJob('GITHUB', 'guild')).toMatchObject({ published: 1, failed: 1 });
  });
  it('releases active protection after provider failure', async () => {
    rows.push([{ count: 0 }]);
    vi.mocked(fetchTrendingRepositories).mockRejectedValueOnce(new Error('API unavailable'));
    await expect(runDiscoveryJob('GITHUB', 'guild')).rejects.toThrow('API unavailable');
    rows.push([{ count: 2 }]);
    expect(await runDiscoveryJob('GITHUB', 'guild')).toMatchObject({ fetched: 0 });
  });
});
