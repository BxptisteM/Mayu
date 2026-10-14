import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

import { runNewsJob, type NewsCategory } from '../../jobs/news.job.js';

const NEWS_COMMANDS = {
  cyber: 'CYBER',
  ia: 'IA',
  os: 'OS',
  hardware: 'HARDWARE',
  devices: 'DEVICES',
  business: 'BUSINESS',
  news: 'NEWS',
} as const satisfies Record<string, NewsCategory>;

export async function handleNewsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (!interaction.guildId) {
    return false;
  }

  let category: NewsCategory;
  let mode: 'daily' | 'more';

  if (interaction.commandName === 'more') {
    const value = interaction.options.getString('category', true);

    if (!Object.values(NEWS_COMMANDS).some((candidate) => candidate === value)) {
      await interaction.reply({
        content: 'This category is not supported by the RSS news job.',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    category = value as NewsCategory;
    mode = 'more';
  } else {
    const value = NEWS_COMMANDS[interaction.commandName as keyof typeof NEWS_COMMANDS];

    if (!value) {
      return false;
    }

    category = value;
    mode = 'daily';
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const result = await runNewsJob(category, interaction.guildId, mode);

  await interaction.editReply({
    content: [
      `Category: ${category}`,
      `Published: ${result.published}/${result.requested}`,
      `Failed: ${result.failed}`,
      `Remaining: ${result.remaining}`,
    ].join('\n'),
  });

  return true;
}
