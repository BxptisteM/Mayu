import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSummarizeCommand } from '../../src/discord/commands/summarize.js';
import { getUserSelections, clearUserSelections } from '../../src/services/selection.service.js';
import { getGuildLanguage } from '../../src/services/guild-settings.service.js';
import { generateMarkdownSummary } from '../../src/ai/markdown-summary.service.js';
import { commandInteraction } from '../helpers/interaction.js';
vi.mock('../../src/services/selection.service.js', () => ({
  getUserSelections: vi.fn(),
  clearUserSelections: vi.fn(),
}));
vi.mock('../../src/services/guild-settings.service.js', () => ({ getGuildLanguage: vi.fn() }));
vi.mock('../../src/ai/markdown-summary.service.js', () => ({ generateMarkdownSummary: vi.fn() }));
vi.mock('../../src/shared/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
const article = {
  id: 'article',
  title: 'News',
  url: 'https://example.com/news',
  description: 'News text',
  summary: null,
  summaryLanguage: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getUserSelections).mockResolvedValue([article]);
  vi.mocked(getGuildLanguage).mockResolvedValue('en');
  vi.mocked(generateMarkdownSummary).mockResolvedValue('# Briefing');
});
describe('Personal Markdown delivery', () => {
  it('does not generate a briefing without selections', async () => {
    const interaction = commandInteraction('summarize');
    vi.mocked(getUserSelections).mockResolvedValue([]);
    await handleSummarizeCommand(interaction);
    expect(generateMarkdownSummary).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith({
      content: 'You have no selected articles. Use Select on published news first.',
    });
  });
  it('delivers the Markdown attachment and only clears delivered selections', async () => {
    const interaction = commandInteraction('summarize');
    await handleSummarizeCommand(interaction);
    expect(getUserSelections).toHaveBeenCalledWith('guild', 'user');
    expect(interaction.user.send).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Your Mayu briefing (1 articles):',
        files: [expect.objectContaining({ attachment: Buffer.from('# Briefing') })],
        allowedMentions: { parse: [] },
      }),
    );
    expect(clearUserSelections).toHaveBeenCalledWith('guild', 'user', ['article']);
    expect(interaction.user.send.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(clearUserSelections).mock.invocationCallOrder[0] ?? 0,
    );
  });
  it('preserves selections when DM delivery fails', async () => {
    const interaction = commandInteraction('summarize');
    interaction.user.send.mockRejectedValue(new Error('DM disabled'));
    await handleSummarizeCommand(interaction);
    expect(clearUserSelections).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('selections have been preserved'),
    });
  });
  it('releases active protection after generation fails', async () => {
    const interaction = commandInteraction('summarize');
    vi.mocked(generateMarkdownSummary).mockRejectedValueOnce(new Error('AI failed'));
    await expect(handleSummarizeCommand(interaction)).rejects.toThrow('AI failed');
    await handleSummarizeCommand(interaction);
    expect(interaction.user.send).toHaveBeenCalledOnce();
  });
  it('isolates active summaries by user and prevents overlapping summaries for one user', async () => {
    const first = commandInteraction('summarize');
    let finishGeneration: (markdown: string) => void = () => undefined;
    let acknowledgeStart: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      acknowledgeStart = resolve;
    });
    vi.mocked(generateMarkdownSummary).mockImplementationOnce(() => {
      acknowledgeStart();
      return new Promise((resolve) => {
        finishGeneration = resolve;
      });
    });
    const running = handleSummarizeCommand(first);
    await started;
    const repeated = commandInteraction('summarize');
    await handleSummarizeCommand(repeated);
    expect(repeated.editReply).toHaveBeenCalledWith({
      content: 'A personal summary is already being generated.',
    });
    expect(repeated.user.send).not.toHaveBeenCalled();
    const otherUser = commandInteraction('summarize');
    Object.assign(otherUser.user, { id: 'other-user' });
    await handleSummarizeCommand(otherUser);
    expect(otherUser.user.send).toHaveBeenCalledOnce();
    expect(getUserSelections).toHaveBeenCalledWith('guild', 'other-user');
    finishGeneration('# Briefing');
    await running;
    expect(first.user.send).toHaveBeenCalledOnce();
  });
});
