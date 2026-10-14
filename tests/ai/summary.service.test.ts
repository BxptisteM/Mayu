import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateArticleSummary } from '../../src/ai/summary.service.js';
import { generateAiCompletion } from '../../src/ai/completion.service.js';
import { resetDatabase, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/ai/completion.service.js', () => ({ generateAiCompletion: vi.fn() }));
const article = {
  id: 'article',
  title: 'News',
  description: 'Source text',
  url: 'https://example.com/news',
};
beforeEach(resetDatabase);
describe('Article summary validation', () => {
  it('stores a valid editorial summary with its language', async () => {
    const summary =
      'Technology researchers disclosed a security update that addresses several weaknesses in widely used software. The supplied report describes the affected systems and explains how administrators can apply the available fixes to reduce exposure.';
    vi.mocked(generateAiCompletion).mockResolvedValue(' ' + summary + ' ');
    expect(await generateArticleSummary(article, 'en')).toBe(summary);
    expect(writes).toEqual([{ summary, summaryLanguage: 'en' }]);
  });
  it.each([null, '', ' '])(
    'rejects missing source descriptions %s without generating',
    async (description) => {
      await expect(generateArticleSummary({ ...article, description }, 'en')).rejects.toThrow(
        'no description',
      );
      expect(generateAiCompletion).not.toHaveBeenCalled();
    },
  );
  it.each(['SAFE', 'I cannot help with that request', 'Too short', 'word '.repeat(121)])(
    'rejects non-editorial or invalid length output',
    async (content) => {
      vi.mocked(generateAiCompletion).mockResolvedValue(content);
      await expect(generateArticleSummary(article, 'en')).rejects.toThrow();
      expect(writes).toEqual([]);
    },
  );
});
