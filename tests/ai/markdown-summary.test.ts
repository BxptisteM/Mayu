import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateMarkdownSummary } from '../../src/ai/markdown-summary.service.js';
import { generateAiCompletion } from '../../src/ai/completion.service.js';
vi.mock('../../src/ai/completion.service.js', () => ({ generateAiCompletion: vi.fn() }));
const article = {
  id: 'id',
  title: 'News [update]',
  url: 'https://example.com/news',
  description: 'Original source text',
  summary: 'English summary',
  summaryLanguage: 'en',
};
beforeEach(() => vi.resetAllMocks());
describe('Markdown briefings', () => {
  it('appends original source references independently of generated content', async () => {
    vi.mocked(generateAiCompletion).mockResolvedValue(
      '# Briefing\n' + 'Relevant news. '.repeat(20),
    );
    const result = await generateMarkdownSummary([article], 'en');
    expect(result).toContain(String.raw`1. [News \[update\]](https://example.com/news)`);
    expect(result).toContain('## Sources');
    expect(generateAiCompletion).toHaveBeenCalledWith(
      'markdown_summary',
      [
        expect.objectContaining({ content: expect.stringContaining('English') }),
        expect.objectContaining({ content: expect.stringContaining('English summary') }),
      ],
      3072,
    );
  });
  it('uses original descriptions when the stored summary language differs', async () => {
    vi.mocked(generateAiCompletion).mockResolvedValue(
      '# Briefing\n' + 'Relevant news. '.repeat(20),
    );
    await generateMarkdownSummary([article], 'fr');
    expect(generateAiCompletion).toHaveBeenCalledWith(
      'markdown_summary',
      [
        expect.objectContaining({ content: expect.stringContaining('French') }),
        expect.objectContaining({ content: expect.stringContaining('Original source text') }),
      ],
      3072,
    );
  });
  it('rejects empty selections without requesting AI', async () => {
    await expect(generateMarkdownSummary([], 'en')).rejects.toThrow('No articles');
    expect(generateAiCompletion).not.toHaveBeenCalled();
  });
  it.each(['short', '```markdown\n# Briefing\n' + 'text '.repeat(50), 'text '.repeat(50)])(
    'rejects invalid Markdown output',
    async (content) => {
      vi.mocked(generateAiCompletion).mockResolvedValue(content);
      await expect(generateMarkdownSummary([article], 'en')).rejects.toThrow('invalid Markdown');
    },
  );
});
