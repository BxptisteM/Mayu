import { EmbedBuilder, Message, TextChannel } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publishDiscoveryItem } from '../../src/services/discovery-publication.service.js';
import { resolveNewsChannel } from '../../src/discord/channel-resolver.js';
import {
  claimPublication,
  finalizePublication,
  markPublicationUncertain,
} from '../../src/services/publication-intent.service.js';
import { resetDatabase, rows } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/discord/channel-resolver.js', () => ({ resolveNewsChannel: vi.fn() }));
vi.mock('../../src/services/publication-intent.service.js', () => ({
  claimPublication: vi.fn(),
  startPublication: vi.fn(),
  finalizePublication: vi.fn(),
  markPublicationUncertain: vi.fn(),
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
const channel = Object.assign(vi.mockObject(TextChannel.prototype), {
  id: 'channel',
  guildId: 'guild',
});
const embed = new EmbedBuilder().setTitle('Discovery');
beforeEach(() => {
  resetDatabase();
  vi.mocked(resolveNewsChannel).mockResolvedValue(channel);
  vi.mocked(claimPublication).mockResolvedValue({ id: 'intent', marker: 'marker' });
  channel.send.mockResolvedValue(
    Object.assign(vi.mockObject(Message.prototype), { id: 'message' }),
  );
});
describe('Discovery publication delivery', () => {
  it.each(['GITHUB', 'PODCASTS'] as const)(
    'publishes %s with a recovery marker',
    async (category) => {
      expect(await publishDiscoveryItem('guild', category, 'item', embed)).toBe(true);
      expect(channel.send).toHaveBeenCalledWith({
        content: '-# marker',
        embeds: [embed],
        allowedMentions: { parse: [] },
      });
      expect(finalizePublication).toHaveBeenCalledWith('intent', 'message');
    },
  );
  it('skips items in publication history', async () => {
    rows.push([{ id: 'published' }]);
    expect(await publishDiscoveryItem('guild', 'GITHUB', 'item', embed)).toBe(false);
    expect(claimPublication).not.toHaveBeenCalled();
    expect(channel.send).not.toHaveBeenCalled();
  });
  it('skips already claimed items', async () => {
    vi.mocked(claimPublication).mockResolvedValueOnce(null);
    expect(await publishDiscoveryItem('guild', 'GITHUB', 'item', embed)).toBe(false);
    expect(channel.send).not.toHaveBeenCalled();
  });
  it('retains uncertain sends for recovery', async () => {
    channel.send.mockRejectedValueOnce(new Error('Discord unavailable'));
    await expect(publishDiscoveryItem('guild', 'GITHUB', 'item', embed)).rejects.toThrow(
      'Discord unavailable',
    );
    expect(markPublicationUncertain).toHaveBeenCalledWith('intent', expect.any(Error));
  });
});
