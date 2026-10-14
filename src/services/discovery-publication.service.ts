import type { EmbedBuilder } from 'discord.js';

import { resolveNewsChannel } from '../discord/channel-resolver.js';
import { logger } from '../shared/logger.js';
import type { DiscoveryCategory } from './discovery-storage.service.js';
import { and, eq } from 'drizzle-orm';
import { db } from '../database/client.js';
import { discoveryPublications } from '../database/schema/index.js';

import {
  claimPublication,
  finalizePublication,
  markPublicationUncertain,
  startPublication,
} from './publication-intent.service.js';

export async function publishDiscoveryItem(
  guildId: string,
  category: DiscoveryCategory,
  itemKey: string,
  embed: EmbedBuilder,
): Promise<boolean> {
  const channel = await resolveNewsChannel(category);

  if (channel.guildId !== guildId) {
    throw new Error('Discovery channel belongs to another guild');
  }

  const [existing] = await db
  .select({ id: discoveryPublications.id })
  .from(discoveryPublications)
  .where(
    and(
      eq(discoveryPublications.guildId, guildId),
      eq(discoveryPublications.category, category),
      eq(discoveryPublications.itemKey, itemKey),
    ),
  )
  .limit(1);

  if (existing) {
    return false;
  }

  const claim = await claimPublication({
    kind: 'discovery',
    guildId,
    channelId: channel.id,
    category,
    itemKey,
  });

  if (!claim) {
    return false;
  }

  try {
    await startPublication(claim.id);

    const message = await channel.send({
      content: `-# ${claim.marker}`,
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

    await finalizePublication(claim.id, message.id);

    logger.info(
      {
        category,
        itemKey,
        channelId: channel.id,
        messageId: message.id,
        intentId: claim.id,
      },
      'Discovery item published',
    );

    return true;
  } catch (error: unknown) {
    try {
      await markPublicationUncertain(claim.id, error);
    } catch (stateError: unknown) {
      logger.error(
        { err: stateError, intentId: claim.id },
        'Failed to preserve discovery publication failure state',
      );
    }

    throw error;
  }
}
