import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

import { runDiscoveryJob } from '../../jobs/discovery.job.js';

export async function handleDiscoveryCommand(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const category =
    interaction.commandName === 'github'
      ? 'GITHUB'
      : interaction.commandName === 'podcasts'
        ? 'PODCASTS'
        : null;

  if (!category) {
    return false;
  }

  if (!interaction.guildId) {
    await interaction.reply({
      content: 'This command is only available in a server.',
      flags: MessageFlags.Ephemeral,
    });

    return true;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const result = await runDiscoveryJob(category, interaction.guildId);

  await interaction.editReply({
    content: [
      `Category: ${result.category}`,
      `Fetched: ${result.fetched}`,
      `Published: ${result.published}`,
      `Failed: ${result.failed}`,
    ].join('\n'),
  });

  return true;
}
