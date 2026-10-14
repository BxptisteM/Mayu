import { Events, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { discordClient } from './client.js';
import { commandNames } from './commands/definitions.js';
import { handleLanguageCommand } from './commands/language.js';
import { handleArticleSelection } from './components/article-selection.handler.js';
import { parseArticleSelectionId } from './components/article-selection.js';
import { handleNewsCommand } from './commands/news.js';
import { handleSummarizeCommand } from './commands/summarize.js';
import { handleDiscoveryCommand } from './commands/discovery.js';

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

  if (interaction.commandName === 'summarize') {
    await handleSummarizeCommand(interaction);
    return;
  }

  if (await handleDiscoveryCommand(interaction)) {
    return;
  }

  if (await handleNewsCommand(interaction)) {
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
    if (interaction.isButton()) {
      if (!parseArticleSelectionId(interaction.customId)) {
        return;
      }

      void handleArticleSelection(interaction).catch(async (error: unknown) => {
        logger.error(
          { err: error, customId: interaction.customId },
          'Article selection interaction failed',
        );

        try {
          const content = 'Failed to update article selection.';

          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content });
          } else {
            await interaction.reply({
              content,
              flags: MessageFlags.Ephemeral,
            });
          }
        } catch (responseError: unknown) {
          logger.error({ err: responseError }, 'Failed to respond to selection interaction');
        }
      });

      return;
    }

    if (interaction.isChatInputCommand()) {
      void handleCommand(interaction).catch(async (error: unknown) => {
        logger.error(
          { err: error, command: interaction.commandName },
          'Discord command interaction failed',
        );

        try {
          const content = 'Command execution failed.';

          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content });
          } else {
            await interaction.reply({
              content,
              flags: MessageFlags.Ephemeral,
            });
          }
        } catch (responseError: unknown) {
          logger.error({ err: responseError }, 'Failed to respond to command interaction');
        }
      });
    }
  });
}
