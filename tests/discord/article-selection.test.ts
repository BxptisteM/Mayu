import { describe, expect, it } from 'vitest';
import {
  buildArticleSelectionRow,
  parseArticleSelectionId,
} from '../../src/discord/components/article-selection.js';
const id = '550e8400-e29b-41d4-a716-446655440000';
describe('Article selection buttons', () => {
  it('builds a parseable selection identifier', () => {
    expect(buildArticleSelectionRow(id).toJSON()).toMatchObject({
      components: [{ custom_id: `article:select:${id}`, label: 'Select', style: 2 }],
    });
    expect(parseArticleSelectionId(`article:select:${id}`)).toBe(id);
  });
  it.each([
    'other:select:' + id,
    'article:select:',
    'article:select:invalid',
    'article:select:' + id + ':extra',
    'article:select:550e8400-e29b-01d4-a716-446655440000',
  ])('rejects invalid identifier %s', (value) => {
    expect(parseArticleSelectionId(value)).toBeNull();
  });
});
