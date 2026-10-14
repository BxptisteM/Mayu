import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isDiscoveryPublished,
  podcastEpisodeKey,
  savePodcastEpisodes,
  saveRepositories,
} from '../../src/services/discovery-storage.service.js';
import { database, resetDatabase, rows, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
beforeEach(resetDatabase);
describe('Discovery storage', () => {
  it('generates stable feed-specific podcast identities without ambiguous concatenation', () => {
    expect(podcastEpisodeKey('feed', 'guid')).toMatch(/^[a-f0-9]{64}$/);
    expect(podcastEpisodeKey('feed', 'guid')).toBe(podcastEpisodeKey('feed', 'guid'));
    expect(podcastEpisodeKey('other', 'guid')).not.toBe(podcastEpisodeKey('feed', 'guid'));
    expect(podcastEpisodeKey('ab', 'c')).not.toBe(podcastEpisodeKey('a', 'bc'));
  });
  it.each(['GITHUB', 'PODCASTS'] as const)(
    'reports existing %s publication history',
    async (category) => {
      rows.push([{ id: 'publication' }]);
      expect(await isDiscoveryPublished('guild', category, 'item')).toBe(true);
    },
  );
  it('reports unpublished items', async () => {
    expect(await isDiscoveryPublished('guild', 'GITHUB', 'item')).toBe(false);
  });
  it('does not insert an empty episode list', async () => {
    await savePodcastEpisodes([]);
    expect(database.insert).not.toHaveBeenCalled();
  });
  it('stores a repository and a star-history snapshot', async () => {
    const repository = {
      id: 1,
      fullName: 'owner/tool',
      url: 'https://github.com/owner/tool',
      description: null,
      language: null,
      stars: 100,
      forks: 10,
      createdAt: new Date('2026-10-13'),
      pushedAt: new Date('2026-10-14'),
    };
    await saveRepositories([repository]);
    expect(writes).toEqual([
      {
        githubId: 1,
        fullName: repository.fullName,
        url: repository.url,
        description: null,
        language: null,
        stars: 100,
        forks: 10,
        createdAt: repository.createdAt,
        pushedAt: repository.pushedAt,
      },
      expect.objectContaining({ githubId: 1, stars: 100 }),
    ]);
  });
});
