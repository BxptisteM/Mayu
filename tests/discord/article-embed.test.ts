import { describe, expect, it } from 'vitest';

import { buildArticleMessage } from '../../src/discord/messages/article.message.js';

describe('Article Discord message', () => {
  const article = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Critical vulnerability discovered',
    url: 'https://example.com/article',
    summary: 'A critical vulnerability has been disclosed.',
    sourceName: 'Example News',
    publishedAt: new Date('2026-10-13T08:00:00Z'),
    category: 'CYBER' as const,
  };

  it('creates an embed with the expected content', () => {
    const message = buildArticleMessage(article);
    const embed = message.embeds?.[0];

    expect(embed).toBeDefined();

    const data = embed && 'toJSON' in embed ? embed.toJSON() : embed;

    expect(data?.title).toBe(article.title);
    expect(data?.url).toBe(article.url);
    expect(data?.description).toBe(article.summary);
    expect(data?.footer?.text).toBe('Mayu - Bxptiste');
    expect(data?.timestamp).toBeDefined();
  });

  it('attaches the article selection button', () => {
    const message = buildArticleMessage(article);
    const row = message.components?.[0];

    expect(row).toBeDefined();

    const data = row && 'toJSON' in row ? row.toJSON() : row;

    expect(data).toMatchObject({
      components: [
        {
          custom_id: `article:select:${article.id}`,
          label: 'Select',
        },
      ],
    });
  });

  it('disables Discord mentions', () => {
    const message = buildArticleMessage(article);

    expect(message.allowedMentions).toEqual({
      parse: [],
    });
  });
});
