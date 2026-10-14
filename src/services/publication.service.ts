import { eq } from 'drizzle-orm';

import { generateArticleSummary } from '../ai/summary.service.js';
import { db } from '../database/client.js';
import { articles } from '../database/schema/index.js';
import { discordClient } from '../discord/client.js';
import { resolveNewsChannel } from '../discord/channel-resolver.js';
import { buildArticleMessage } from '../discord/messages/article.message.js';
import type { RankedArticle } from '../editorial/types.js';
import { logger } from '../shared/logger.js';

import {
  claimPublication,
  finalizePublication,
  markPublicationUncertain,
  startPublication,
} from './publication-intent.service.js';

type Language = 'fr' | 'en';

export interface PublicationResult {
  articleId: string;
  messageId: string;
  channelId: string;
}

export async function publishArticle(
  article: RankedArticle,
  guildId: string,
  language: Language,
): Promise<PublicationResult> {
  if (!discordClient.isReady()) {
    throw new Error('Discord client is not ready');
  }

  const channel = await resolveNewsChannel(article.category);

  if (channel.guildId !== guildId) {
    throw new Error('Publication channel belongs to another guild');
  }

  const [stored] = await db
    .select({
      isPublished: articles.isPublished,
      summary: articles.summary,
      summaryLanguage: articles.summaryLanguage,
    })
    .from(articles)
    .where(eq(articles.id, article.id))
    .limit(1);

  if (!stored || stored.isPublished) {
    throw new Error('Article already published or unavailable');
  }

  // Generate before claiming: an AI failure cannot leave
  // an unused publication intent behind.
  const summary =
    stored.summary && stored.summaryLanguage === language
      ? stored.summary
      : await generateArticleSummary(article, language);

  const claim = await claimPublication({
    kind: 'rss',
    guildId,
    channelId: channel.id,
    category: article.category,
    itemKey: article.id,
  });

  if (!claim) {
    throw new Error('Article publication already claimed');
  }

  const payload = buildArticleMessage({
    id: article.id,
    title: article.title,
    url: article.url,
    summary,
    sourceName: article.sourceName,
    publishedAt: article.publishedAt,
    category: article.category,
  });

  try {
    await startPublication(claim.id);

    const message = await channel.send({
      ...payload,
      content: `-# ${claim.marker}`,
      allowedMentions: { parse: [] },
    });

    await finalizePublication(claim.id, message.id);

    logger.info(
      {
        articleId: article.id,
        category: article.category,
        channelId: channel.id,
        messageId: message.id,
        intentId: claim.id,
      },
      'Article published to Discord',
    );

    return {
      articleId: article.id,
      channelId: channel.id,
      messageId: message.id,
    };
  } catch (error: unknown) {
    try {
      await markPublicationUncertain(claim.id, error);
    } catch (stateError: unknown) {
      logger.error(
        { err: stateError, intentId: claim.id },
        'Failed to preserve publication failure state',
      );
    }

    throw error;
  }
}
