import { AttachmentBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

import { generateMarkdownSummary } from '../../ai/markdown-summary.service.js';
import { logger } from '../../shared/logger.js';
import { getGuildLanguage } from '../../services/guild-settings.service.js';
import { clearUserSelections, getUserSelections } from '../../services/selection.service.js';

const activeSummaries = new Set<string>();

export async function handleSummarizeCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: 'This command is only available in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const userId = interaction.user.id;
  const jobKey = `${guildId}:${userId}`;

  if (activeSummaries.has(jobKey)) {
    await interaction.editReply({
      content: 'A personal summary is already being generated.',
    });
    return;
  }

  activeSummaries.add(jobKey);

  try {
    const articles = await getUserSelections(guildId, userId);

    if (articles.length === 0) {
      await interaction.editReply({
        content: 'You have no selected articles. Use Select on published news first.',
      });
      return;
    }

    const language = await getGuildLanguage(guildId);

    const markdown = await generateMarkdownSummary(articles, language);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `mayu-summary-${date}.md`;

    const attachment = new AttachmentBuilder(Buffer.from(markdown, 'utf8'), { name: filename });

    try {
      await interaction.user.send({
        content:
          language === 'fr'
            ? `Votre récapitulatif Mayu (${articles.length} articles) :`
            : `Your Mayu briefing (${articles.length} articles):`,
        files: [attachment],
        allowedMentions: { parse: [] },
      });
    } catch (error: unknown) {
      logger.warn({ err: error, guildId, userId }, 'Failed to deliver personal Markdown summary');

      await interaction.editReply({
        content:
          'Could not send your summary by DM. Check your privacy settings. Your selections have been preserved.',
      });
      return;
    }

    // Only clear selections after Discord confirms DM delivery.
    try {
      await clearUserSelections(
        guildId,
        userId,
        articles.map((article) => article.id),
      );
    } catch (error: unknown) {
      logger.error({ err: error, guildId, userId }, 'Failed to clear delivered article selections');
    }

    logger.info(
      {
        guildId,
        userId,
        articlesIncluded: articles.length,
      },
      'Personal Markdown summary delivered',
    );

    await interaction.editReply({
      content: `Summary sent by DM (${articles.length} articles).`,
    });
  } finally {
    activeSummaries.delete(jobKey);
  }
}
