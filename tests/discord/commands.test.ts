import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import { handleNewsCommand } from '../../src/discord/commands/news.js';
import { handleLanguageCommand } from '../../src/discord/commands/language.js';
import { handleBudgetCommand } from '../../src/discord/commands/budget.js';
import { handleDiscoveryCommand } from '../../src/discord/commands/discovery.js';
import { runNewsJob } from '../../src/jobs/news.job.js';
import { runDiscoveryJob } from '../../src/jobs/discovery.job.js';
import { setGuildLanguage } from '../../src/services/guild-settings.service.js';
import { getBudgetStatus } from '../../src/ai/budget.service.js';
import { commandInteraction } from '../helpers/interaction.js';
vi.mock('../../src/config/env.js', () => ({ env: { OPENROUTER_MODEL: 'openrouter/free' } }));
vi.mock('../../src/jobs/news.job.js', () => ({ runNewsJob: vi.fn() }));
vi.mock('../../src/jobs/discovery.job.js', () => ({ runDiscoveryJob: vi.fn() }));
vi.mock('../../src/services/guild-settings.service.js', () => ({ setGuildLanguage: vi.fn() }));
vi.mock('../../src/ai/budget.service.js', () => ({ getBudgetStatus: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
describe('News commands', () => {
  it('routes supported news commands and reports their result', async () => {
    const interaction = commandInteraction('cyber');
    vi.mocked(runNewsJob).mockResolvedValue({
      category: 'CYBER',
      requested: 5,
      published: 3,
      failed: 1,
      remaining: 2,
    });
    expect(await handleNewsCommand(interaction)).toBe(true);
    expect(runNewsJob).toHaveBeenCalledWith('CYBER', 'guild', 'daily');
    expect(interaction.editReply).toHaveBeenCalledWith({
      content: 'Category: CYBER\nPublished: 3/5\nFailed: 1\nRemaining: 2',
    });
  });
  it('returns false for unsupported commands', async () => {
    expect(await handleNewsCommand(commandInteraction('unknown'))).toBe(false);
    expect(runNewsJob).not.toHaveBeenCalled();
  });
  it('validates additional publication categories', async () => {
    const interaction = commandInteraction('more', 'GITHUB');
    expect(await handleNewsCommand(interaction)).toBe(true);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('not supported') }),
    );
    expect(runNewsJob).not.toHaveBeenCalled();
  });
  it('uses additional mode for supported categories', async () => {
    const interaction = commandInteraction('more');
    vi.mocked(runNewsJob).mockResolvedValue({
      category: 'CYBER',
      requested: 3,
      published: 0,
      failed: 0,
      remaining: 3,
    });
    await handleNewsCommand(interaction);
    expect(runNewsJob).toHaveBeenCalledWith('CYBER', 'guild', 'more');
  });
});
describe('Language command', () => {
  it('requires a guild', async () => {
    const interaction = commandInteraction('language', 'en');
    Object.assign(interaction, { guildId: null });
    await handleLanguageCommand(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'This command is only available in a server.' }),
    );
    expect(setGuildLanguage).not.toHaveBeenCalled();
  });
  it('requires Manage Server permission', async () => {
    const interaction = commandInteraction('language', 'en');
    Object.assign(interaction, { memberPermissions: new PermissionsBitField() });
    await handleLanguageCommand(interaction);
    expect(setGuildLanguage).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Manage Server') }),
    );
  });
  it.each(['en', 'fr', 'invalid'])('validates language %s', async (language) => {
    const interaction = commandInteraction('language', language);
    Object.assign(interaction, {
      memberPermissions: new PermissionsBitField(PermissionFlagsBits.ManageGuild),
    });
    await handleLanguageCommand(interaction);
    if (language === 'invalid') {
      expect(setGuildLanguage).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Unsupported language.' }),
      );
    } else {
      expect(setGuildLanguage).toHaveBeenCalledWith('guild', language);
      expect(interaction.editReply).toHaveBeenCalledOnce();
    }
  });
});
describe('Budget command', () => {
  it('reports spent, reserved and available funds', async () => {
    const interaction = commandInteraction('budget');
    vi.mocked(getBudgetStatus).mockResolvedValue({
      limitUsd: 10,
      spentUsd: 2,
      reservedUsd: 3,
      remainingUsd: 5,
    });
    await handleBudgetCommand(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith({
      content:
        '**Mayu — OpenRouter budget**\nModel: `openrouter/free`\nMonthly limit: $10.0000\nSpent: $2.0000\nReserved: $3.0000\nAvailable: $5.0000',
      allowedMentions: { parse: [] },
    });
  });
});
describe('Discovery commands', () => {
  it.each([
    ['github', 'GITHUB'],
    ['podcasts', 'PODCASTS'],
  ] as const)('routes /%s to discovery', async (name, category) => {
    const interaction = commandInteraction(name);
    vi.mocked(runDiscoveryJob).mockResolvedValue({ category, fetched: 2, published: 1, failed: 0 });
    expect(await handleDiscoveryCommand(interaction)).toBe(true);
    expect(runDiscoveryJob).toHaveBeenCalledWith(category, 'guild');
    expect(interaction.editReply).toHaveBeenCalledWith({
      content: `Category: ${category}\nFetched: 2\nPublished: 1\nFailed: 0`,
    });
  });
  it('does not handle unrelated commands', async () => {
    expect(await handleDiscoveryCommand(commandInteraction('news'))).toBe(false);
    expect(runDiscoveryJob).not.toHaveBeenCalled();
  });
});
