import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAiCompletion } from '../../src/ai/completion.service.js';
import { createCompletion } from '../../src/ai/openrouter.client.js';
import {
  completeAiReservation,
  markAiReservationUncertain,
  reserveAiBudget,
} from '../../src/ai/reservation.service.js';
import { env } from '../../src/config/env.js';
vi.mock('../../src/config/env.js', () => ({
  env: {
    OPENROUTER_MODEL: 'openrouter/free',
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_ALLOW_PAID_MODELS: false,
    OPENROUTER_INPUT_USD_PER_MILLION: 0,
    OPENROUTER_OUTPUT_USD_PER_MILLION: 0,
    OPENROUTER_MAX_INPUT_TOKENS: 2000,
    OPENROUTER_MAX_OUTPUT_TOKENS: 1000,
  },
}));
vi.mock('../../src/ai/openrouter.client.js', () => ({ createCompletion: vi.fn() }));
vi.mock('../../src/ai/reservation.service.js', () => ({
  estimateMaximumCost: vi.fn(() => 0),
  reserveAiBudget: vi.fn(),
  completeAiReservation: vi.fn(),
  markAiReservationUncertain: vi.fn(),
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { error: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(env, {
    OPENROUTER_MODEL: 'openrouter/free',
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_ALLOW_PAID_MODELS: false,
    OPENROUTER_INPUT_USD_PER_MILLION: 0,
    OPENROUTER_OUTPUT_USD_PER_MILLION: 0,
  });
  vi.mocked(reserveAiBudget).mockResolvedValue({ id: 'reservation', reservedUsd: 0 });
  vi.mocked(createCompletion).mockResolvedValue({
    content: ' Result ',
    model: 'openrouter/free',
    inputTokens: 10,
    outputTokens: 5,
    costUsd: 0,
  });
});
describe('AI completion accounting', () => {
  it.each(['openrouter/free', 'vendor/model:free'])(
    'accepts free model %s and records usage',
    async (model) => {
      env.OPENROUTER_MODEL = model;
      expect(await generateAiCompletion('article_summary', [], 100)).toBe('Result');
      expect(completeAiReservation).toHaveBeenCalledWith('reservation', 'article_summary', {
        model: 'openrouter/free',
        inputTokens: 10,
        outputTokens: 5,
        costUsd: 0,
      });
      expect(markAiReservationUncertain).not.toHaveBeenCalled();
    },
  );
  it('rejects paid models before reserving or requesting', async () => {
    env.OPENROUTER_MODEL = 'vendor/paid';
    await expect(generateAiCompletion('article_summary', [], 100)).rejects.toThrow(
      'Paid OpenRouter models are disabled',
    );
    expect(reserveAiBudget).not.toHaveBeenCalled();
    expect(createCompletion).not.toHaveBeenCalled();
  });
  it('requires both paid pricing rates', async () => {
    env.OPENROUTER_MODEL = 'vendor/paid';
    env.OPENROUTER_ALLOW_PAID_MODELS = true;
    await expect(generateAiCompletion('article_summary', [], 100)).rejects.toThrow(
      'pricing must be configured',
    );
  });
  it('requires an API key', async () => {
    env.OPENROUTER_API_KEY = ' ';
    await expect(generateAiCompletion('article_summary', [], 100)).rejects.toThrow(
      'API_KEY is not configured',
    );
    expect(createCompletion).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, 1001, Infinity])('rejects invalid output token limit %s', async (limit) => {
    await expect(generateAiCompletion('article_summary', [], limit)).rejects.toThrow(
      'output exceeds',
    );
    expect(reserveAiBudget).not.toHaveBeenCalled();
  });
  it('enforces the input limit using UTF-8 bytes', async () => {
    await expect(
      generateAiCompletion('article_summary', [{ role: 'user', content: 'é'.repeat(1000) }], 100),
    ).rejects.toThrow('input exceeds');
    expect(createCompletion).not.toHaveBeenCalled();
  });
  it('does not send requests after reservation rejection', async () => {
    vi.mocked(reserveAiBudget).mockRejectedValue(new Error('Budget exhausted'));
    await expect(generateAiCompletion('article_summary', [], 100)).rejects.toThrow(
      'Budget exhausted',
    );
    expect(createCompletion).not.toHaveBeenCalled();
  });
  it('records billed empty completions before rejecting editorial content', async () => {
    vi.mocked(createCompletion).mockResolvedValue({
      content: ' ',
      model: 'free',
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0,
    });
    await expect(generateAiCompletion('article_summary', [], 100)).rejects.toThrow(
      'empty completion',
    );
    expect(completeAiReservation).toHaveBeenCalledOnce();
    expect(markAiReservationUncertain).not.toHaveBeenCalled();
  });
  it.each([null, -1, NaN, Infinity])(
    'retains an uncertain reservation for invalid cost %s',
    async (costUsd) => {
      vi.mocked(createCompletion).mockResolvedValue({
        content: 'Result',
        model: 'free',
        inputTokens: 10,
        outputTokens: 5,
        costUsd,
      });
      await expect(generateAiCompletion('article_summary', [], 100)).rejects.toThrow();
      expect(markAiReservationUncertain).toHaveBeenCalledWith('reservation', expect.any(String));
      expect(completeAiReservation).not.toHaveBeenCalled();
    },
  );
  it('preserves the original request failure if uncertainty recording fails', async () => {
    vi.mocked(createCompletion).mockRejectedValue(new Error('Timed out'));
    vi.mocked(markAiReservationUncertain).mockRejectedValue(new Error('Database unavailable'));
    await expect(generateAiCompletion('article_summary', [], 100)).rejects.toThrow('Timed out');
  });
  it('accepts paid models only when enabled with both pricing rates', async () => {
    Object.assign(env, {
      OPENROUTER_MODEL: 'vendor/paid',
      OPENROUTER_ALLOW_PAID_MODELS: true,
      OPENROUTER_INPUT_USD_PER_MILLION: 1,
      OPENROUTER_OUTPUT_USD_PER_MILLION: 2,
    });
    expect(await generateAiCompletion('article_summary', [], 100)).toBe('Result');
    expect(reserveAiBudget).toHaveBeenCalledWith('article_summary', 'vendor/paid', 0);
  });
  it('retains uncertainty when successful response accounting fails', async () => {
    vi.mocked(completeAiReservation).mockRejectedValueOnce(new Error('Accounting failed'));
    await expect(generateAiCompletion('article_summary', [], 100)).rejects.toThrow(
      'Accounting failed',
    );
    expect(markAiReservationUncertain).toHaveBeenCalledWith('reservation', 'Accounting failed');
  });
});
