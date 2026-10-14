import { sql } from 'drizzle-orm';
import type { EmbedBuilder } from 'discord.js';

import { db } from '../database/client.js';
import { discoveryPublications } from '../database/schema/index.js';
import { resolveNewsChannel } from '../discord/channel-resolver.js';
import { logger } from '../shared/logger.js';

import type { DiscoveryCategory } from './discovery-storage.service.js';

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

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtext(${`mayu:discovery:${guildId}:${category}:${itemKey}`})
      )
    `);

    const [existing] = await tx
      .select({ id: discoveryPublications.id })
      .from(discoveryPublications)
      .where(
        sql`${discoveryPublications.guildId} = ${guildId}
          AND ${discoveryPublications.category} = ${category}
          AND ${discoveryPublications.itemKey} = ${itemKey}`,
      )
      .limit(1);

    if (existing) {
      return false;
    }

    const message = await channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

    try {
      await tx.insert(discoveryPublications).values({
        guildId,
        category,
        itemKey,
        channelId: channel.id,
        messageId: message.id,
      });
    } catch (error: unknown) {
      try {
        await message.delete();
      } catch (cleanupError: unknown) {
        logger.error(
          {
            err: cleanupError,
            category,
            itemKey,
            messageId: message.id,
          },
          'Failed to remove unrecorded discovery message',
        );
      }

      throw error;
    }

    logger.info(
      {
        category,
        itemKey,
        channelId: channel.id,
        messageId: message.id,
      },
      'Discovery item published',
    );

    return true;
  });
}
