import { describe, expect, it } from 'vitest';
import { selectPodcastEpisodes } from '../../src/podcasts/podcast.selector.js';
import type { PodcastEpisode } from '../../src/podcasts/podcast.provider.js';
const now = new Date('2026-10-14T12:00:00Z');
const episode: PodcastEpisode = {
  podcastName: 'Tech',
  guid: 'one',
  title: 'News',
  url: 'https://example.com/one',
  description: '',
  feedUrl: 'https://example.com/rss',
  publishedAt: now,
};
describe('Podcast episode selection', () => {
  it('round-robins podcasts to preserve diversity', () => {
    const older = { ...episode, guid: 'two', publishedAt: new Date('2026-10-13T12:00:00Z') };
    const other = { ...older, guid: 'three', podcastName: 'Security' };
    expect(selectPodcastEpisodes([older, episode, other], 2, now)).toEqual([episode, other]);
  });
  it('deduplicates by GUID and falls back to URL', () => {
    expect(selectPodcastEpisodes([episode, episode], 5, now)).toEqual([episode]);
    const noGuid = { ...episode, guid: '' };
    expect(selectPodcastEpisodes([noGuid, noGuid], 5, now)).toEqual([noGuid]);
  });
  it.each(['2026-10-01', '2026-10-15', 'invalid'])(
    'excludes invalid or out-of-window date %s',
    (date) => {
      expect(selectPodcastEpisodes([{ ...episode, publishedAt: new Date(date) }], 5, now)).toEqual(
        [],
      );
    },
  );
  it('includes the seven-day boundary', () => {
    const boundary = { ...episode, publishedAt: new Date('2026-10-07T12:00:00Z') };
    expect(selectPodcastEpisodes([boundary], 5, now)).toEqual([boundary]);
  });
  it('handles empty inputs and zero limits', () => {
    expect(selectPodcastEpisodes([], 5, now)).toEqual([]);
    expect(selectPodcastEpisodes([episode], 0, now)).toEqual([]);
  });
});
