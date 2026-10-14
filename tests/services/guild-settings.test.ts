import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGuildLanguage, setGuildLanguage } from '../../src/services/guild-settings.service.js';
import { filters, resetDatabase, rows, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
beforeEach(resetDatabase);
describe('Guild language settings', () => {
  it('defaults unconfigured guilds to French', async () => {
    expect(await getGuildLanguage('guild')).toBe('fr');
    expect(filters[0]?.params).toEqual(['guild']);
  });
  it('returns a stored language', async () => {
    rows.push([{ language: 'en' }]);
    expect(await getGuildLanguage('guild')).toBe('en');
  });
  it('stores language for the requested guild', async () => {
    await setGuildLanguage('guild', 'en');
    expect(writes).toEqual([{ guildId: 'guild', language: 'en' }]);
  });
});
