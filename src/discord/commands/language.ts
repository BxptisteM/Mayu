import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';

import { setGuildLanguage } from '../../services/guild-settings.service.js';

export async function handleLanguageCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'This command is only available in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: 'You need the Manage Server permission to change the language.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const language = interaction.options.getString('value', true);

  if (language !== 'fr' && language !== 'en') {
    await interaction.reply({
      content: 'Unsupported language.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  await setGuildLanguage(interaction.guildId, language);

  await interaction.editReply({
    content: `Generated content language updated to ${language === 'fr' ? 'French' : 'English'}.`,
  });
}
