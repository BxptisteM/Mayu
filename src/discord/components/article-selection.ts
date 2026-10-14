import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const SELECTION_PREFIX = 'article:select:';

export function buildArticleSelectionRow(articleId: string): ActionRowBuilder<ButtonBuilder> {
  const button = new ButtonBuilder()
    .setCustomId(`${SELECTION_PREFIX}${articleId}`)
    .setLabel('Select')
    .setEmoji('📌')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

export function parseArticleSelectionId(customId: string): string | null {
  if (!customId.startsWith(SELECTION_PREFIX)) {
    return null;
  }

  const articleId = customId.slice(SELECTION_PREFIX.length);

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    articleId,
  )
    ? articleId
    : null;
}
