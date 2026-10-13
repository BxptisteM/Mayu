import { describe, expect, it } from 'vitest';

import { classifyArticle, isTechnologyArticle } from '../../src/editorial/classifier.js';

const publishedAt = new Date();

describe('Editorial classification', () => {
  it('classifies a critical vulnerability as cybersecurity', () => {
    expect(
      classifyArticle({
        title: 'Critical zero-day vulnerability discovered in VPN software',
        description: 'Attackers are actively exploiting the flaw.',
        url: 'https://example.com/cyber',
        publishedAt,
      }),
    ).toBe('CYBER');
  });

  it('classifies a technology acquisition as business', () => {
    expect(
      classifyArticle({
        title: 'Technology company announces major acquisition',
        description: 'The acquisition expands its cloud business.',
        url: 'https://example.com/business',
        publishedAt,
      }),
    ).toBe('BUSINESS');
  });

  it('rejects unrelated content from general technology news', () => {
    expect(
      isTechnologyArticle({
        title: 'Local restaurant opens a new location',
        description: 'The restaurant announced its opening today.',
        url: 'https://example.com/restaurant',
        publishedAt,
      }),
    ).toBe(false);
  });
});
