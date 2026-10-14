import { inArray } from 'drizzle-orm';
import { ChannelType } from 'discord.js';

import { db } from '../database/client.js';
import { publicationIntents } from '../database/schema/index.js';
import { discordClient } from '../discord/client.js';
import { logger } from '../shared/logger.js';

import {
  finalizePublication,
  publicationMarker,
} from './publication-intent.service.js';

export interface RecoveryResult {
  recovered: number;
  uncertain: number;
  pending: number;
}

export async function recoverPublications(): Promise<RecoveryResult> {
  const result: RecoveryResult = {
    recovered: 0,
    uncertain: 0,
    pending: 0,
  };

  const intents = await db
    .select()
    .from(publicationIntents)
    .where(
      inArray(publicationIntents.status, [
        'pending',
        'sending',
        'uncertain',
      ]),
    );

  for (const intent of intents) {
    // No Discord send was started.
    // The next normal job can be retried explicitly if required.
    if (intent.status === 'pending') {
      result.pending++;
      continue;
    }

    try {
      const channel = await discordClient.channels.fetch(intent.channelId);

      if (!channel || channel.type !== ChannelType.GuildText) {
        result.uncertain++;
        logger.warn(
          { intentId: intent.id, channelId: intent.channelId },
          'Publication channel unavailable for reconciliation',
        );
        continue;
      }

      // Discord history is bounded. Absence from these messages
      // is NOT proof that the message was never sent.
      const messages = await channel.messages.fetch({ limit: 100 });

      const marker = publicationMarker(intent.id);

      const found = messages.find(
        (message) =>
          message.author.id === discordClient.user?.id &&
          message.content.includes(marker),
      );

      if (!found) {
        result.uncertain++;

        logger.warn(
          {
            intentId: intent.id,
            category: intent.category,
            channelId: intent.channelId,
          },
          'Publication requires manual reconciliation',
        );

        continue;
      }

      await finalizePublication(intent.id, found.id);

      result.recovered++;
    } catch (error: unknown) {
      result.uncertain++;

      logger.error(
        { err: error, intentId: intent.id },
        'Publication recovery failed',
      );
    }
  }

  logger.info(result, 'Publication recovery completed');

  return result;
}
