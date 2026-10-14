import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCompletion } from '../../src/ai/openrouter.client.js';
vi.mock('../../src/config/env.js', () => ({
  env: {
    OPENROUTER_MODEL: 'openrouter/free',
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_TIMEOUT_MS: 1000,
    OPENROUTER_MAX_OUTPUT_TOKENS: 1024,
  },
}));
const fetchMock = vi.fn<typeof fetch>();
const payload = {
  model: 'openrouter/free',
  choices: [{ message: { content: ' Result ' } }],
  usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0 },
};
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
describe('OpenRouter completion client', () => {
  it('constructs the request and parses a completion', async () => {
    fetchMock.mockResolvedValue(Response.json(payload));
    const messages = [{ role: 'user' as const, content: 'Summarize this article' }];
    expect(await createCompletion(messages, 200)).toEqual({
      content: 'Result',
      model: 'openrouter/free',
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
        body: JSON.stringify({
          model: 'openrouter/free',
          messages,
          max_tokens: 200,
          temperature: 0.2,
          stream: false,
          reasoning: { effort: 'none' },
          usage: { include: true },
        }),
      }),
    );
  });
  it('preserves missing cost as unknown', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ...payload, usage: { prompt_tokens: 10, completion_tokens: 5 } }),
    );
    expect(await createCompletion([])).toMatchObject({ costUsd: null });
  });
  it('returns empty content for a null completion', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ...payload, choices: [{ message: { content: null } }] }),
    );
    expect(await createCompletion([])).toMatchObject({ content: '' });
  });
  it.each([
    {},
    { ...payload, choices: [] },
    { ...payload, usage: { prompt_tokens: -1, completion_tokens: 0 } },
    { ...payload, usage: { prompt_tokens: 1, completion_tokens: 0, cost: -1 } },
  ])('rejects invalid response %j', async (response) => {
    fetchMock.mockResolvedValue(Response.json(response));
    await expect(createCompletion([])).rejects.toThrow();
  });
  it('reports HTTP errors with bounded response text', async () => {
    fetchMock.mockResolvedValue(new Response('denied', { status: 429 }));
    await expect(createCompletion([])).rejects.toThrow('HTTP 429 - denied');
  });
  it('propagates request timeouts', async () => {
    fetchMock.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
    await expect(createCompletion([])).rejects.toThrow('Timed out');
  });
});
