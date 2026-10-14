import { beforeEach, describe, expect, it, vi } from 'vitest';
import { synchronizeSources } from '../../src/sources/source-sync.js';
import { loadSourceConfig } from '../../src/sources/source-config.js';
import { database, resetDatabase, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/sources/source-config.js', () => ({ loadSourceConfig: vi.fn() }));
vi.mock('../../src/shared/logger.js', () => ({ logger: { info: vi.fn() } }));
beforeEach(resetDatabase);
describe('Source synchronization', () => {
  it('stores validated source configuration transactionally', async () => {
    const source = {
      name: 'News',
      url: 'https://example.com/rss',
      type: 'rss' as const,
      tags: ['CYBER' as const],
      enabled: true,
    };
    vi.mocked(loadSourceConfig).mockResolvedValue([source]);
    await synchronizeSources();
    expect(writes).toEqual([source]);
    expect(database.transaction).toHaveBeenCalledOnce();
  });
  it('does not mutate storage when configuration validation fails', async () => {
    vi.mocked(loadSourceConfig).mockRejectedValueOnce(new Error('Invalid configuration'));
    await expect(synchronizeSources()).rejects.toThrow('Invalid configuration');
    expect(database.transaction).not.toHaveBeenCalled();
  });
});
