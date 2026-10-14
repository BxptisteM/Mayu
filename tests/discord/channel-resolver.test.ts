import { ChannelType, TextChannel } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveNewsChannel } from '../../src/discord/channel-resolver.js';
import { discordClient } from '../../src/discord/client.js';
vi.mock('../../src/discord/client.js', () => ({ discordClient: { channels: { fetch: vi.fn() } } }));
vi.mock('../../src/discord/channels.js', () => ({ CATEGORY_CHANNELS: { CYBER: 'channel' } }));
beforeEach(() => vi.resetAllMocks());
describe('Discord news channel resolution', () => {
  it('returns a configured guild text channel', async () => {
    const channel = Object.assign(vi.mockObject(TextChannel.prototype), {
      type: ChannelType.GuildText,
    });
    vi.mocked(discordClient.channels.fetch).mockResolvedValue(channel);
    expect(await resolveNewsChannel('CYBER')).toBe(channel);
    expect(discordClient.channels.fetch).toHaveBeenCalledWith('channel');
  });
  it('rejects inaccessible channels', async () => {
    vi.mocked(discordClient.channels.fetch).mockResolvedValue(null);
    await expect(resolveNewsChannel('CYBER')).rejects.toThrow('not found');
  });
  it('rejects other channel types', async () => {
    const channel = Object.assign(vi.mockObject(TextChannel.prototype), {
      type: ChannelType.GuildVoice,
    });
    vi.mocked(discordClient.channels.fetch).mockResolvedValue(channel);
    await expect(resolveNewsChannel('CYBER')).rejects.toThrow('Invalid Discord channel type');
  });
});
