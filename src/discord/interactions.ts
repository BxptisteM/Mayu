import { Events, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { discordClient } from './client.js';
import { commandNames } from './commands/definitions.js';

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.guildId !== env.DISCORD_GUILD_ID) {
    await interaction.reply({
      content: "Vous n'êtes pas autorisé à utiliser cette commande.",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (!commandNames.has(interaction.commandName)) {
    await interaction.reply({
      content: 'Commande inconnue.',
      flags: MessageFlags.Ephemeral,
    });

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
    content: `La commande /${interaction.commandName} n'est pas encore implémentée.`,
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
        const content = "Une erreur est survenue pendant l'exécution de la commande.";

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
