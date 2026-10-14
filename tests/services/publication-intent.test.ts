import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimPublication,
  finalizePublication,
  markPublicationUncertain,
  publicationKey,
  publicationMarker,
  startPublication,
} from '../../src/services/publication-intent.service.js';
import { database, resetDatabase, rows, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn() } }));
const identity = {
  kind: 'rss' as const,
  guildId: 'guild',
  channelId: 'channel',
  category: 'CYBER',
  itemKey: 'article',
};
beforeEach(resetDatabase);
describe('Publication intents', () => {
  it('generates stable identities independent of channel changes', () => {
    expect(publicationKey(identity)).toBe('rss:guild:CYBER:article');
    expect(publicationKey({ ...identity, channelId: 'other' })).toBe(publicationKey(identity));
    expect(publicationMarker('id')).toBe('mayu-publication:id');
  });
  it('creates an intent and its reconciliation marker', async () => {
    rows.push([{ id: 'id' }]);
    expect(await claimPublication(identity)).toEqual({ id: 'id', marker: 'mayu-publication:id' });
    expect(writes).toEqual([{ ...identity, key: 'rss:guild:CYBER:article' }]);
  });
  it('does not claim an existing intent', async () => {
    expect(await claimPublication(identity)).toBeNull();
  });
  it('starts pending publications', async () => {
    rows.push([{ id: 'id' }]);
    await startPublication('id');
    expect(writes).toEqual([expect.objectContaining({ status: 'sending' })]);
  });
  it('rejects unavailable pending intents', async () => {
    await expect(startPublication('id')).rejects.toThrow('not pending');
  });
  it('retains a bounded error for uncertain sends', async () => {
    await markPublicationUncertain('id', new Error('x'.repeat(3000)));
    expect(writes).toEqual([
      expect.objectContaining({ status: 'uncertain', error: 'x'.repeat(2000) }),
    ]);
  });
  it('rejects missing publication intents', async () => {
    await expect(finalizePublication('id', 'message')).rejects.toThrow('not found');
  });
  it('accepts duplicate finalization for the same message', async () => {
    rows.push([{ status: 'published', messageId: 'message' }]);
    await finalizePublication('id', 'message');
    expect(database.insert).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });
  it('rejects finalization with a conflicting message', async () => {
    rows.push([{ status: 'published', messageId: 'other' }]);
    await expect(finalizePublication('id', 'message')).rejects.toThrow('another message');
  });
  it.each(['rss', 'discovery'])(
    'finalizes %s history and marks the intent published',
    async (kind) => {
      rows.push([{ ...identity, kind, status: 'sending' }], [{ messageId: 'message' }]);
      await finalizePublication('id', 'message');
      expect(writes).toContainEqual(
        expect.objectContaining({ messageId: 'message', guildId: 'guild', channelId: 'channel' }),
      );
      expect(writes).toContainEqual(
        expect.objectContaining({ status: 'published', messageId: 'message', error: null }),
      );
      if (kind === 'rss')
        expect(writes).toContainEqual(expect.objectContaining({ isPublished: true }));
    },
  );
  it.each(['rss', 'discovery'])('rejects conflicting %s publication history', async (kind) => {
    rows.push([{ ...identity, kind, status: 'sending' }], [{ messageId: 'other' }]);
    await expect(finalizePublication('id', 'message')).rejects.toThrow(
      'conflicts with existing history',
    );
    expect(writes).not.toContainEqual(expect.objectContaining({ status: 'published' }));
  });
});
