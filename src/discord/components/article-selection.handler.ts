import { MessageFlags, type ButtonInteraction } from 'discord.js';

import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';
import { toggleArticleSelection } from '../../services/selection.service.js';

import { parseArticleSelectionId } from './article-selection.js';

export async function handleArticleSelection(interaction: ButtonInteraction): Promise<void> {
  const articleId = parseArticleSelectionId(interaction.customId);

  if (!articleId) {
    return;
  }

  if (interaction.guildId !== env.DISCORD_GUILD_ID || !interaction.guildId) {
    await interaction.reply({
      content: 'This interaction is not available in this server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Acknowledge the interaction before accessing PostgreSQL.
  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const result = await toggleArticleSelection(
    interaction.guildId,
    interaction.user.id,
    articleId,
    interaction.message.id,
  );

  logger.debug(
    {
      userId: interaction.user.id,
      articleId,
      selected: result.selected,
      selectionCount: result.count,
    },
    'Article selection updated',
  );

  await interaction.editReply({
    content: result.selected
      ? `Article selected. You currently have ${result.count} selected article(s).`
      : `Article deselected. You currently have ${result.count} selected article(s).`,
  });
}
