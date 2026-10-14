import { EmbedBuilder, type APIEmbed } from 'discord.js';

import type { Category } from '../../sources/categories.js';

export interface ArticleEmbedData {
  title: string;
  url: string;
  summary: string;
  sourceName: string;
  publishedAt: Date;
  category: Category;
}

const CATEGORY_COLORS: Record<Category, number> = {
  CYBER: 0xed4245,
  IA: 0x9b59b6,
  OS: 0x3498db,
  HARDWARE: 0xe67e22,
  DEVICES: 0x1abc9c,
  BUSINESS: 0xf1c40f,
  NEWS: 0x5865f2,
  GITHUB: 0x2ecc71,
  PODCASTS: 0xe91e63,
};

export function buildArticleEmbed(article: ArticleEmbedData): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(CATEGORY_COLORS[article.category])
    .setTitle(article.title.slice(0, 256))
    .setURL(article.url)
    .setDescription(article.summary.slice(0, 4096))
    .addFields({
      name: 'Source',
      value: article.sourceName.slice(0, 1024),
      inline: true,
    })
    .setFooter({
      text: 'Mayu - Bxptiste',
    })
    .setTimestamp(new Date());
}

export function serializeArticleEmbed(article: ArticleEmbedData): APIEmbed {
  return buildArticleEmbed(article).toJSON();
}
