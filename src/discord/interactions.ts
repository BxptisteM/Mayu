import { Events, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { discordClient } from './client.js';
import { commandNames } from './commands/definitions.js';
import { handleLanguageCommand } from './commands/language.js';

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.guildId !== env.DISCORD_GUILD_ID) {
    await interaction.reply({
      content: 'You are not authorized to use this command.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (!commandNames.has(interaction.commandName)) {
    await interaction.reply({
      content: 'Unknown command.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (interaction.commandName === 'language') {
    await handleLanguageCommand(interaction);
    return;
  }

  logger.info(
    {
      command: interaction.commandName,
      userId: interaction.user.id,
    },
    'Discord command executed',
  );

  await interaction.reply({
    content: `The /${interaction.commandName} command has not been implemented yet.`,
    flags: MessageFlags.Ephemeral,
  });
}

export function registerInteractionHandlers(): void {
  discordClient.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    void handleCommand(interaction).catch(async (error: unknown) => {
      logger.error({ err: error, command: interaction.commandName }, 'Discord interaction failed');

      try {
        const content = 'An error occurred while executing the command.';

        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content,
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (responseError: unknown) {
        logger.error({ err: responseError }, 'Failed to respond to Discord interaction');
      }
    });
  });
}
