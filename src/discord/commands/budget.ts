import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

import { env } from '../../config/env.js';
import { getBudgetStatus } from '../../ai/budget.service.js';

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

export async function handleBudgetCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const budget = await getBudgetStatus();

  await interaction.editReply({
    content: [
      '**Mayu — OpenRouter budget**',
      `Model: \`${env.OPENROUTER_MODEL}\``,
      `Monthly limit: ${formatUsd(budget.limitUsd)}`,
      `Spent: ${formatUsd(budget.spentUsd)}`,
      `Reserved: ${formatUsd(budget.reservedUsd)}`,
      `Available: ${formatUsd(budget.remainingUsd)}`,
    ].join('\n'),
    allowedMentions: { parse: [] },
  });
}
