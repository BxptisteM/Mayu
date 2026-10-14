import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { CATEGORIES } from '../../src/sources/categories.js';
import { loadSourceConfig } from '../../src/sources/source-config.js';
vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));
const source = { name: ' News ', url: 'https://example.com/rss', type: 'rss', tags: ['CYBER'] };
beforeEach(() => vi.resetAllMocks());
describe('RSS source configuration', () => {
  it('trims names and defaults enabled to true', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify([source]));
    expect(await loadSourceConfig()).toEqual([{ ...source, name: 'News', enabled: true }]);
  });
  it.each(
    [
      [],
      [{ ...source, tags: ['UNKNOWN'] }],
      [{ ...source, tags: [] }],
      [{ ...source, url: 'ftp://example.com/rss' }],
      [{ ...source, name: ' ' }],
      [{ ...source, type: 'api' }],
    ].map((config) => ({ config })),
  )('rejects invalid configuration $config', async ({ config }) => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(config));
    await expect(loadSourceConfig()).rejects.toThrow();
  });
  it('rejects duplicate feed URLs', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify([source, source]));
    await expect(loadSourceConfig()).rejects.toThrow('Duplicate source URLs');
  });
  it('rejects malformed JSON', async () => {
    vi.mocked(readFile).mockResolvedValue('{');
    await expect(loadSourceConfig()).rejects.toThrow();
  });
  it('propagates configuration read failures', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('Unreadable'));
    await expect(loadSourceConfig()).rejects.toThrow('Unreadable');
  });
  it('accepts every supported source category and explicit disabled status', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify([{ ...source, tags: CATEGORIES, enabled: false }]),
    );
    expect(await loadSourceConfig()).toEqual([
      { ...source, name: 'News', tags: [...CATEGORIES], enabled: false },
    ]);
  });
});
