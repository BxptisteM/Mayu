import { ButtonInteraction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleArticleSelection } from '../../src/discord/components/article-selection.handler.js';
import { toggleArticleSelection } from '../../src/services/selection.service.js';
vi.mock('../../src/config/env.js', () => ({ env: { DISCORD_GUILD_ID: 'guild' } }));
vi.mock('../../src/services/selection.service.js', () => ({ toggleArticleSelection: vi.fn() }));
vi.mock('../../src/shared/logger.js', () => ({ logger: { debug: vi.fn() } }));
const id = '550e8400-e29b-41d4-a716-446655440000';
beforeEach(() => vi.resetAllMocks());
describe('Article selection interactions', () => {
  it.each([true, false])('acknowledges and reports selection state %s', async (selected) => {
    const interaction = Object.assign(vi.mockObject(ButtonInteraction.prototype), {
      customId: `article:select:${id}`,
      guildId: 'guild',
      user: { id: 'user' },
      message: { id: 'message' },
    });
    vi.mocked(toggleArticleSelection).mockResolvedValue({ selected, count: 2 });
    await handleArticleSelection(interaction);
    expect(toggleArticleSelection).toHaveBeenCalledWith('guild', 'user', id, 'message');
    expect(interaction.editReply).toHaveBeenCalledWith({
      content: `Article ${selected ? 'selected' : 'deselected'}. You currently have 2 selected article(s).`,
    });
    expect(interaction.deferReply.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(toggleArticleSelection).mock.invocationCallOrder[0] ?? 0,
    );
  });
  it('rejects selections from another guild', async () => {
    const interaction = Object.assign(vi.mockObject(ButtonInteraction.prototype), {
      customId: `article:select:${id}`,
      guildId: 'other',
    });
    await handleArticleSelection(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'This interaction is not available in this server.' }),
    );
    expect(toggleArticleSelection).not.toHaveBeenCalled();
  });
  it('ignores unrelated buttons', async () => {
    const interaction = Object.assign(vi.mockObject(ButtonInteraction.prototype), {
      customId: 'unrelated',
    });
    await handleArticleSelection(interaction);
    expect(interaction.reply).not.toHaveBeenCalled();
    expect(toggleArticleSelection).not.toHaveBeenCalled();
  });
});
