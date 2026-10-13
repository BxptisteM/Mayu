import { Client, Events, GatewayIntentBits } from 'discord.js';

import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

export const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds],
});

discordClient.once(Events.ClientReady, (client) => {
  logger.info(
    {
      bot: client.user.tag,
      applicationId: client.application?.id ?? env.DISCORD_APPLICATION_ID,
      guildCount: client.guilds.cache.size,
    },
    'Discord client connected',
  );

  if (!client.guilds.cache.has(env.DISCORD_GUILD_ID)) {
    logger.warn({ guildId: env.DISCORD_GUILD_ID }, 'Configured guild not found');
  }
});

discordClient.on(Events.Error, (error) => {
  logger.error({ err: error }, 'Discord client error');
});

export async function connectDiscord(): Promise<void> {
  logger.info('Connecting to Discord');

  await discordClient.login(env.DISCORD_BOT_TOKEN);
}

export async function disconnectDiscord(): Promise<void> {
  await discordClient.destroy();

  logger.info('Discord client disconnected');
}
