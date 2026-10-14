import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../database/client.js';
import {
  articles,
  discoveryPublications,
  publicationIntents,
  publications,
} from '../database/schema/index.js';
import { logger } from '../shared/logger.js';

export interface PublicationIdentity {
  kind: 'rss' | 'discovery';
  guildId: string;
  channelId: string;
  category: string;
  itemKey: string;
}

export interface PublicationClaim {
  id: string;
  marker: string;
}

export function publicationKey(identity: PublicationIdentity): string {
  return [
    identity.kind,
    identity.guildId,
    identity.category,
    identity.itemKey,
  ].join(':');
}

export function publicationMarker(id: string): string {
  return `mayu-publication:${id}`;
}

export async function claimPublication(
  identity: PublicationIdentity,
): Promise<PublicationClaim | null> {
  const [created] = await db
    .insert(publicationIntents)
    .values({
      key: publicationKey(identity),
      kind: identity.kind,
      guildId: identity.guildId,
      channelId: identity.channelId,
      category: identity.category,
      itemKey: identity.itemKey,
    })
    .onConflictDoNothing({ target: publicationIntents.key })
    .returning({ id: publicationIntents.id });

  // An existing intent must never be sent again blindly.
  if (!created) {
    return null;
  }

  return {
    id: created.id,
    marker: publicationMarker(created.id),
  };
}

export async function startPublication(intentId: string): Promise<void> {
  const [updated] = await db
    .update(publicationIntents)
    .set({
      status: 'sending',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publicationIntents.id, intentId),
        eq(publicationIntents.status, 'pending'),
      ),
    )
    .returning({ id: publicationIntents.id });

  if (!updated) {
    throw new Error('Publication intent is not pending');
  }
}

export async function markPublicationUncertain(
  intentId: string,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error ? error.message : 'Unknown publication error';

  await db
    .update(publicationIntents)
    .set({
      status: 'uncertain',
      error: message.slice(0, 2000),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publicationIntents.id, intentId),
        inArray(publicationIntents.status, ['sending', 'uncertain']),
      ),
    );
}

export async function finalizePublication(
  intentId: string,
  messageId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtext(${`mayu:intent:${intentId}`})
      )
    `);

    const [intent] = await tx
      .select()
      .from(publicationIntents)
      .where(eq(publicationIntents.id, intentId))
      .limit(1);

    if (!intent) {
      throw new Error('Publication intent not found');
    }

    if (intent.status === 'published') {
      if (intent.messageId !== messageId) {
        throw new Error('Publication already finalized with another message');
      }

      return;
    }

    if (intent.kind === 'rss') {
      await tx
        .insert(publications)
        .values({
          articleId: intent.itemKey,
          category: intent.category,
          guildId: intent.guildId,
          channelId: intent.channelId,
          messageId,
        })
        .onConflictDoNothing();

      const [existing] = await tx
        .select({ messageId: publications.messageId })
        .from(publications)
        .where(eq(publications.articleId, intent.itemKey))
        .limit(1);

      if (!existing || existing.messageId !== messageId) {
        throw new Error('RSS publication conflicts with existing history');
      }

      await tx
        .update(articles)
        .set({
          isPublished: true,
          discordPublishedAt: new Date(),
        })
        .where(eq(articles.id, intent.itemKey));
    } else if (intent.kind === 'discovery') {
      await tx
        .insert(discoveryPublications)
        .values({
          guildId: intent.guildId,
          category: intent.category,
          itemKey: intent.itemKey,
          channelId: intent.channelId,
          messageId,
        })
        .onConflictDoNothing();

      const [existing] = await tx
        .select({ messageId: discoveryPublications.messageId })
        .from(discoveryPublications)
        .where(
          and(
            eq(discoveryPublications.guildId, intent.guildId),
            eq(discoveryPublications.category, intent.category),
            eq(discoveryPublications.itemKey, intent.itemKey),
          ),
        )
        .limit(1);

      if (!existing || existing.messageId !== messageId) {
        throw new Error('Discovery publication conflicts with existing history');
      }
    } else {
      throw new Error(`Unknown publication kind: ${intent.kind}`);
    }

    await tx
      .update(publicationIntents)
      .set({
        status: 'published',
        messageId,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(publicationIntents.id, intentId));
  });

  logger.info({ intentId, messageId }, 'Publication finalized');
}
