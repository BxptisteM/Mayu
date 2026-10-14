import type { MessageCreateOptions } from 'discord.js';

import type { Category } from '../../sources/categories.js';
import { buildArticleSelectionRow } from '../components/article-selection.js';
import { buildArticleEmbed } from '../embeds/article.embed.js';

export interface ArticleMessageData {
  id: string;
  title: string;
  url: string;
  summary: string;
  sourceName: string;
  publishedAt: Date;
  category: Category;
}

export function buildArticleMessage(article: ArticleMessageData): MessageCreateOptions {
  return {
    embeds: [
      buildArticleEmbed({
        title: article.title,
        url: article.url,
        summary: article.summary,
        sourceName: article.sourceName,
        publishedAt: article.publishedAt,
        category: article.category,
      }),
    ],
    components: [buildArticleSelectionRow(article.id)],
    allowedMentions: {
      parse: [],
    },
  };
}
