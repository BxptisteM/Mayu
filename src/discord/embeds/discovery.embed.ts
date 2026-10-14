import { EmbedBuilder } from 'discord.js';

import type { GitHubRepository } from '../../github/github.provider.js';
import type { PodcastEpisode } from '../../podcasts/podcast.provider.js';

export function buildGitHubEmbed(repository: GitHubRepository): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(repository.fullName.slice(0, 256))
    .setURL(repository.url)
    .setDescription((repository.description?.trim() || 'No description provided.').slice(0, 4096))
    .addFields(
      {
        name: 'Stars',
        value: repository.stars.toLocaleString('en-US'),
        inline: true,
      },
      {
        name: 'Forks',
        value: repository.forks.toLocaleString('en-US'),
        inline: true,
      },
      {
        name: 'Language',
        value: repository.language ?? 'Unknown',
        inline: true,
      },
    )
    .setFooter({ text: 'Mayu - Bxptiste' })
    .setTimestamp();
}

export function buildPodcastEmbed(episode: PodcastEpisode): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xe91e63)
    .setTitle(episode.title.slice(0, 256))
    .setURL(episode.url)
    .setDescription(
      (episode.description.trim() || 'No episode description provided.').slice(0, 3000),
    )
    .addFields({
      name: 'Podcast',
      value: episode.podcastName.slice(0, 1024),
      inline: true,
    })
    .setTimestamp(episode.publishedAt)
    .setFooter({ text: 'Mayu - Bxptiste' });
}
