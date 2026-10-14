import { and, eq, sql } from 'drizzle-orm';

import { db } from '../database/client.js';
import { articles, publications } from '../database/schema/index.js';
import { discordClient } from '../discord/client.js';
import { resolveNewsChannel } from '../discord/channel-resolver.js';
import { buildArticleMessage } from '../discord/messages/article.message.js';
import { generateArticleSummary } from '../ai/summary.service.js';
import { logger } from '../shared/logger.js';
import type { RankedArticle } from '../editorial/types.js';

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

  // Avoid generating a summary if the article is already published.
  const [stored] = await db
    .select({
      isPublished: articles.isPublished,
      summary: articles.summary,
      summaryLanguage: articles.summaryLanguage,
    })
    .from(articles)
    .where(eq(articles.id, article.id))
    .limit(1);

  if (!stored) {
    throw new Error('Article not found');
  }

  if (stored.isPublished) {
    throw new Error('Article already published');
  }

  const summary =
    stored.summary && stored.summaryLanguage === language
      ? stored.summary
      : await generateArticleSummary(article, language);

  // Discord cannot participate in a PostgreSQL transaction.
  // This first implementation serializes competing publishers and
  // compensates for database failures by deleting the sent message.
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(
        hashtext(${`mayu:publication:${article.id}`})
      )`,
    );

    const [current] = await tx
      .select({
        id: articles.id,
        isPublished: articles.isPublished,
      })
      .from(articles)
      .where(eq(articles.id, article.id))
      .limit(1);

    if (!current || current.isPublished) {
      throw new Error('Article already published or unavailable');
    }

    const [existingPublication] = await tx
      .select({ id: publications.id })
      .from(publications)
      .where(eq(publications.articleId, article.id))
      .limit(1);

    if (existingPublication) {
      throw new Error('Article already has a Discord publication');
    }

    const message = await channel.send(
      buildArticleMessage({
        id: article.id,
        title: article.title,
        url: article.url,
        summary,
        sourceName: article.sourceName,
        publishedAt: article.publishedAt,
        category: article.category,
      }),
    );

    try {
      await tx.insert(publications).values({
        articleId: article.id,
        category: article.category,
        guildId,
        channelId: channel.id,
        messageId: message.id,
      });

      await tx
        .update(articles)
        .set({
          isPublished: true,
          discordPublishedAt: new Date(),
        })
        .where(and(eq(articles.id, article.id), eq(articles.isPublished, false)));
    } catch (error: unknown) {
      try {
        await message.delete();
      } catch (cleanupError: unknown) {
        logger.error(
          {
            err: cleanupError,
            articleId: article.id,
            messageId: message.id,
          },
          'Failed to remove an unrecorded Discord message',
        );
      }

      throw error;
    }

    logger.info(
      {
        articleId: article.id,
        category: article.category,
        channelId: channel.id,
        messageId: message.id,
      },
      'Article published to Discord',
    );

    return {
      articleId: article.id,
      messageId: message.id,
      channelId: channel.id,
    };
  });
}
