import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearUserSelections,
  toggleArticleSelection,
} from '../../src/services/selection.service.js';
import { database, filters, resetDatabase, rows, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
beforeEach(resetDatabase);
describe('User article selections', () => {
  it('selects a published article for the specified user and guild', async () => {
    rows.push([{ id: 'publication' }], [], [{ id: 'selection' }]);
    expect(await toggleArticleSelection('guild', 'user', 'article', 'message')).toEqual({
      selected: true,
      count: 1,
    });
    expect(writes).toEqual([{ guildId: 'guild', userId: 'user', articleId: 'article' }]);
  });
  it('deselects an existing selection', async () => {
    rows.push([{ id: 'publication' }], [{ id: 'selection' }], []);
    expect(await toggleArticleSelection('guild', 'user', 'article', 'message')).toEqual({
      selected: false,
      count: 0,
    });
    expect(database.delete).toHaveBeenCalledOnce();
    expect(database.insert).not.toHaveBeenCalled();
  });
  it('rejects articles without a matching publication', async () => {
    await expect(toggleArticleSelection('guild', 'user', 'article', 'message')).rejects.toThrow(
      'publication not found',
    );
    expect(database.insert).not.toHaveBeenCalled();
    expect(database.delete).not.toHaveBeenCalled();
  });
  it('does not clear selections when no delivered article IDs are supplied', async () => {
    await clearUserSelections('guild', 'user', []);
    expect(database.delete).not.toHaveBeenCalled();
  });
  it('scopes selection lookup and removal to the same guild and user', async () => {
    rows.push([{ id: 'publication' }], [{ id: 'selection' }], []);
    await toggleArticleSelection('guild', 'user', 'article', 'message');
    expect(filters[0]?.params).toEqual(['article', 'guild', 'message']);
    expect(filters[1]?.params).toEqual(['guild', 'user', 'article']);
    expect(filters[2]?.params).toEqual(['guild', 'user', 'article']);
    expect(filters[3]?.params).toEqual(['guild', 'user']);
  });
  it('clears only delivered articles for the requested user', async () => {
    await clearUserSelections('guild', 'user', ['delivered']);
    expect(filters[0]?.params).toEqual(['guild', 'user', 'delivered']);
  });
});
