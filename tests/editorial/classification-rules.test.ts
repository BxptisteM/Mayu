import { describe, expect, it } from 'vitest';
import { classifyArticle, isTechnologyArticle } from '../../src/editorial/classifier.js';
const article = {
  title: '',
  description: null,
  url: 'https://example.com/news',
  publishedAt: new Date('2026-10-14'),
};
describe('Editorial category rules', () => {
  it.each([
    ['New AI model benchmark', 'IA'],
    ['Linux kernel update', 'OS'],
    ['New GPU architecture', 'HARDWARE'],
    ['Smartphone and smartwatch launch', 'DEVICES'],
    ['Technology company earnings', 'BUSINESS'],
    ['New podcast episode', 'PODCASTS'],
  ])('classifies %s as %s without a description', (title, category) => {
    expect(classifyArticle({ ...article, title })).toBe(category);
  });
  it('does not classify on weak description-only signals', () => {
    expect(
      classifyArticle({
        ...article,
        title: 'Weekly report',
        description: 'An AI model uses machine learning and neural networks.',
      }),
    ).toBeNull();
  });
  it('weights headline signals more strongly than description signals', () => {
    expect(
      classifyArticle({
        ...article,
        title: 'New GPU launch',
        description: 'The AI model uses deep learning and neural networks.',
      }),
    ).toBe('HARDWARE');
  });
  it('recognizes general technology without assigning a specialist category', () => {
    const general = { ...article, title: 'TypeScript framework improves developer APIs' };
    expect(classifyArticle(general)).toBeNull();
    expect(isTechnologyArticle(general)).toBe(true);
  });
});
