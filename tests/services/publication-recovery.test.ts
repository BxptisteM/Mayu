import { ChannelType } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recoverPublications } from '../../src/services/publication-recovery.service.js';
import { finalizePublication } from '../../src/services/publication-intent.service.js';
import { discordClient } from '../../src/discord/client.js';
import { resetDatabase, rows } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/discord/client.js', () => ({
  discordClient: { user: { id: 'bot' }, channels: { fetch: vi.fn() } },
}));
vi.mock('../../src/services/publication-intent.service.js', () => ({
  finalizePublication: vi.fn(),
  publicationMarker: (id: string) => `mayu-publication:${id}`,
}));
vi.mock('../../src/shared/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
const fetchChannel = vi.mocked(discordClient.channels.fetch);
const history = vi.fn();
const send = vi.fn();
const intent = { id: 'intent', channelId: 'channel', status: 'sending' };
beforeEach(() => {
  resetDatabase();
  history.mockReset();
  send.mockReset();
});
describe('Startup publication recovery', () => {
  it('leaves pending sends for explicit retries without fetching Discord', async () => {
    rows.push([{ ...intent, status: 'pending' }]);
    expect(await recoverPublications()).toEqual({ recovered: 0, uncertain: 0, pending: 1 });
    expect(fetchChannel).not.toHaveBeenCalled();
  });
  it('finalizes a matching message authored by the bot', async () => {
    rows.push([intent]);
    history.mockResolvedValue([
      { id: 'message', author: { id: 'bot' }, content: '-# mayu-publication:intent' },
    ]);
    fetchChannel.mockResolvedValue(
      Object.assign(vi.mockObject((await import('discord.js')).TextChannel.prototype), {
        type: ChannelType.GuildText,
        messages: { fetch: history },
        send,
      }),
    );
    expect(await recoverPublications()).toEqual({ recovered: 1, uncertain: 0, pending: 0 });
    expect(finalizePublication).toHaveBeenCalledWith('intent', 'message');
    expect(send).not.toHaveBeenCalled();
  });
  it('does not republish when the marker is absent or belongs to another user', async () => {
    rows.push([{ ...intent, status: 'uncertain' }]);
    history.mockResolvedValue([
      { id: 'message', author: { id: 'other' }, content: 'mayu-publication:intent' },
    ]);
    fetchChannel.mockResolvedValue(
      Object.assign(vi.mockObject((await import('discord.js')).TextChannel.prototype), {
        type: ChannelType.GuildText,
        messages: { fetch: history },
        send,
      }),
    );
    expect(await recoverPublications()).toEqual({ recovered: 0, uncertain: 1, pending: 0 });
    expect(finalizePublication).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it('keeps inaccessible channels uncertain', async () => {
    rows.push([intent]);
    fetchChannel.mockResolvedValue(null);
    expect(await recoverPublications()).toMatchObject({ uncertain: 1 });
    expect(finalizePublication).not.toHaveBeenCalled();
  });
  it('continues after Discord fetch errors', async () => {
    rows.push([intent, { ...intent, id: 'other' }]);
    fetchChannel.mockRejectedValueOnce(new Error('Forbidden')).mockResolvedValueOnce(null);
    expect(await recoverPublications()).toMatchObject({ uncertain: 2 });
    expect(fetchChannel).toHaveBeenCalledTimes(2);
  });
});
