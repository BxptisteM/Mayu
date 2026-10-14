import { Events, InteractionResponse } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerInteractionHandlers } from '../../src/discord/interactions.js';
import { discordClient } from '../../src/discord/client.js';
import { handleNewsCommand } from '../../src/discord/commands/news.js';
import { commandInteraction } from '../helpers/interaction.js';
vi.mock('../../src/discord/client.js', async () => {
  const { Client } = await import('discord.js');
  return { discordClient: new Client({ intents: [] }) };
});
vi.mock('../../src/config/env.js', () => ({ env: { DISCORD_GUILD_ID: 'guild' } }));
vi.mock('../../src/discord/commands/news.js', () => ({ handleNewsCommand: vi.fn() }));
vi.mock('../../src/discord/commands/discovery.js', () => ({
  handleDiscoveryCommand: vi.fn(async () => false),
}));
vi.mock('../../src/discord/commands/language.js', () => ({ handleLanguageCommand: vi.fn() }));
vi.mock('../../src/discord/commands/summarize.js', () => ({ handleSummarizeCommand: vi.fn() }));
vi.mock('../../src/discord/commands/budget.js', () => ({ handleBudgetCommand: vi.fn() }));
vi.mock('../../src/discord/components/article-selection.handler.js', () => ({
  handleArticleSelection: vi.fn(),
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  discordClient.removeAllListeners();
  registerInteractionHandlers();
});
describe('Discord interaction routing', () => {
  it.each([
    { command: 'cyber', guildId: 'other', content: 'You are not authorized to use this command.' },
    { command: 'unknown', guildId: 'guild', content: 'Unknown command.' },
  ])('rejects /$command in $guildId', async ({ command, guildId, content }) => {
    const interaction = commandInteraction(command);
    Object.assign(interaction, { guildId });
    interaction.isChatInputCommand.mockReturnValue(true);
    let acknowledge: () => void = () => undefined;
    const replied = new Promise<void>((resolve) => {
      acknowledge = resolve;
    });
    interaction.reply.mockImplementation(async () => {
      acknowledge();
      return vi.mockObject(InteractionResponse.prototype);
    });
    discordClient.emit(Events.InteractionCreate, interaction);
    await replied;
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content }));
    expect(handleNewsCommand).not.toHaveBeenCalled();
  });
  it('responds to command failures without sending an unhandled rejection', async () => {
    const interaction = commandInteraction('cyber');
    interaction.isChatInputCommand.mockReturnValue(true);
    vi.mocked(handleNewsCommand).mockRejectedValueOnce(new Error('Job failed'));
    let acknowledge: () => void = () => undefined;
    const replied = new Promise<void>((resolve) => {
      acknowledge = resolve;
    });
    interaction.reply.mockImplementation(async () => {
      acknowledge();
      return vi.mockObject(InteractionResponse.prototype);
    });
    discordClient.emit(Events.InteractionCreate, interaction);
    await replied;
    expect(handleNewsCommand).toHaveBeenCalledWith(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Command execution failed.' }),
    );
  });
});
