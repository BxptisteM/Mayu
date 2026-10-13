import 'dotenv/config';

import { REST, Routes } from 'discord.js';

import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';
import { commands } from './definitions.js';

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_BOT_TOKEN);

  const route = Routes.applicationGuildCommands(env.DISCORD_APPLICATION_ID, env.DISCORD_GUILD_ID);

  await rest.put(route, {
    body: commands.map((command) => command.toJSON()),
  });

  logger.info(
    {
      guildId: env.DISCORD_GUILD_ID,
      count: commands.length,
    },
    'Discord commands registered',
  );
}

registerCommands().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to register Discord commands');
  process.exitCode = 1;
});
