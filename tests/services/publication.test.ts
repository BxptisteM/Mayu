import { Message, TextChannel } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publishArticle } from '../../src/services/publication.service.js';
import { resolveNewsChannel } from '../../src/discord/channel-resolver.js';
import { generateArticleSummary } from '../../src/ai/summary.service.js';
import {
  claimPublication,
  finalizePublication,
  markPublicationUncertain,
  startPublication,
} from '../../src/services/publication-intent.service.js';
import { discordClient } from '../../src/discord/client.js';
import { resetDatabase, rows } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/discord/client.js', () => ({ discordClient: { isReady: vi.fn(() => true) } }));
vi.mock('../../src/discord/channel-resolver.js', () => ({ resolveNewsChannel: vi.fn() }));
vi.mock('../../src/ai/summary.service.js', () => ({ generateArticleSummary: vi.fn() }));
vi.mock('../../src/services/publication-intent.service.js', () => ({
  claimPublication: vi.fn(),
  finalizePublication: vi.fn(),
  markPublicationUncertain: vi.fn(),
  startPublication: vi.fn(),
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
const article = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'News',
  url: 'https://example.com/news',
  description: 'Source',
  publishedAt: new Date('2026-10-14'),
  sourceId: null,
  sourceName: 'News',
  category: 'CYBER' as const,
  score: 80,
};
const channel = Object.assign(vi.mockObject(TextChannel.prototype), {
  id: 'channel',
  guildId: 'guild',
});
beforeEach(() => {
  resetDatabase();
  vi.mocked(discordClient.isReady).mockReturnValue(true);
  vi.mocked(resolveNewsChannel).mockResolvedValue(channel);
  vi.mocked(claimPublication).mockResolvedValue({
    id: 'intent',
    marker: 'mayu-publication:intent',
  });
  channel.send.mockResolvedValue(
    Object.assign(vi.mockObject(Message.prototype), { id: 'message' }),
  );
});
describe('RSS publication delivery', () => {
  it('reuses the matching summary and finalizes the delivered message', async () => {
    rows.push([{ isPublished: false, summary: 'Stored summary', summaryLanguage: 'en' }]);
    expect(await publishArticle(article, 'guild', 'en')).toEqual({
      articleId: article.id,
      channelId: 'channel',
      messageId: 'message',
    });
    expect(generateArticleSummary).not.toHaveBeenCalled();
    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '-# mayu-publication:intent',
        allowedMentions: { parse: [] },
      }),
    );
    expect(startPublication).toHaveBeenCalledWith('intent');
    expect(finalizePublication).toHaveBeenCalledWith('intent', 'message');
  });
  it('generates the summary before claiming the publication', async () => {
    rows.push([{ isPublished: false, summary: null, summaryLanguage: null }]);
    vi.mocked(generateArticleSummary).mockRejectedValueOnce(new Error('AI failed'));
    await expect(publishArticle(article, 'guild', 'en')).rejects.toThrow('AI failed');
    expect(claimPublication).not.toHaveBeenCalled();
    expect(channel.send).not.toHaveBeenCalled();
  });
  it('preserves uncertainty after a Discord send failure', async () => {
    rows.push([{ isPublished: false, summary: 'Summary', summaryLanguage: 'en' }]);
    const error = new Error('Send failed');
    channel.send.mockRejectedValueOnce(error);
    await expect(publishArticle(article, 'guild', 'en')).rejects.toThrow('Send failed');
    expect(markPublicationUncertain).toHaveBeenCalledWith('intent', error);
    expect(finalizePublication).not.toHaveBeenCalled();
  });
  it('rejects a channel from another guild', async () => {
    Object.assign(channel, { guildId: 'other' });
    await expect(publishArticle(article, 'guild', 'en')).rejects.toThrow('another guild');
    Object.assign(channel, { guildId: 'guild' });
    expect(claimPublication).not.toHaveBeenCalled();
  });
  it('requires a ready Discord client', async () => {
    vi.mocked(discordClient.isReady).mockReturnValue(false);
    await expect(publishArticle(article, 'guild', 'en')).rejects.toThrow('not ready');
    expect(resolveNewsChannel).not.toHaveBeenCalled();
  });
  it('rejects published articles', async () => {
    rows.push([{ isPublished: true }]);
    await expect(publishArticle(article, 'guild', 'en')).rejects.toThrow('already published');
    expect(channel.send).not.toHaveBeenCalled();
  });
  it('never resends an already claimed intent', async () => {
    rows.push([{ isPublished: false, summary: 'Summary', summaryLanguage: 'en' }]);
    vi.mocked(claimPublication).mockResolvedValueOnce(null);
    await expect(publishArticle(article, 'guild', 'en')).rejects.toThrow('already claimed');
    expect(channel.send).not.toHaveBeenCalled();
  });
});
