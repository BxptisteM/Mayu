import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeAiReservation,
  estimateMaximumCost,
  markAiReservationUncertain,
  monthBounds,
  reserveAiBudget,
} from '../../src/ai/reservation.service.js';
import { database, resetDatabase, rows, writes } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/config/env.js', () => ({
  env: {
    OPENROUTER_INPUT_USD_PER_MILLION: 1,
    OPENROUTER_OUTPUT_USD_PER_MILLION: 2,
    OPENROUTER_MONTHLY_BUDGET_USD: 10,
    OPENROUTER_MAX_CONCURRENT_REQUESTS: 2,
    OPENROUTER_TIMEOUT_MS: 1000,
  },
}));
vi.mock('../../src/shared/logger.js', () => ({ logger: { warn: vi.fn() } }));
beforeEach(resetDatabase);
describe('AI budget reservations', () => {
  it('calculates UTC month boundaries across years', () => {
    expect(monthBounds(new Date('2026-12-31T23:00:00Z'))).toEqual({
      start: new Date('2026-12-01T00:00:00Z'),
      end: new Date('2027-01-01T00:00:00Z'),
    });
  });
  it('estimates maximum input and output costs', () => {
    expect(estimateMaximumCost(1000, 500)).toBe(0.002);
  });
  it.each([-1, 1.5, Infinity])('rejects invalid token estimates %s', (tokens) => {
    expect(() => estimateMaximumCost(tokens, 10)).toThrow('Invalid token estimate');
  });
  it('marks stale reservations uncertain before creating a new reservation', async () => {
    rows.push(
      [{ id: 'stale' }],
      [{ total: '1' }],
      [{ total: '2' }],
      [{ count: 0 }],
      [{ id: 'new' }],
    );
    expect(await reserveAiBudget('article_summary', 'model', 0.5)).toEqual({
      id: 'new',
      reservedUsd: 0.5,
    });
    expect(writes).toEqual([
      expect.objectContaining({ status: 'uncertain' }),
      { model: 'model', operation: 'article_summary', reservedUsd: '0.5000000000' },
    ]);
    expect(database.execute).toHaveBeenCalledOnce();
  });
  it('includes outstanding reservations in the monthly limit', async () => {
    rows.push([], [{ total: '8' }], [{ total: '2' }], [{ count: 0 }]);
    await expect(reserveAiBudget('article_summary', 'model', 0.01)).rejects.toThrow('Insufficient');
    expect(database.insert).not.toHaveBeenCalled();
  });
  it('rejects requests at the concurrency limit', async () => {
    rows.push([], [{ total: '0' }], [{ total: '0' }], [{ count: 2 }]);
    await expect(reserveAiBudget('article_summary', 'model', 0)).rejects.toThrow(
      'concurrency limit',
    );
  });
  it.each([-1, NaN, Infinity])(
    'rejects invalid reservation amount %s before a transaction',
    async (amount) => {
      await expect(reserveAiBudget('article_summary', 'model', amount)).rejects.toThrow(
        'Invalid AI cost',
      );
      expect(database.transaction).not.toHaveBeenCalled();
    },
  );
  it('records usage and completes a matching reservation', async () => {
    rows.push([{ status: 'reserved', operation: 'article_summary' }]);
    await completeAiReservation('id', 'article_summary', {
      model: 'model',
      inputTokens: 10,
      outputTokens: 20,
      costUsd: 0.1,
    });
    expect(writes).toEqual([
      {
        operation: 'article_summary',
        model: 'model',
        inputTokens: 10,
        outputTokens: 20,
        costUsd: '0.1000000000',
      },
      expect.objectContaining({ status: 'completed', actualUsd: '0.1000000000' }),
    ]);
  });
  it.each(
    [
      [],
      [{ status: 'completed', operation: 'article_summary' }],
      [{ status: 'reserved', operation: 'markdown_summary' }],
    ].map((current) => ({ current })),
  )('rejects unavailable or incompatible reservations $current', async ({ current }) => {
    rows.push(current);
    await expect(
      completeAiReservation('id', 'article_summary', {
        model: 'model',
        inputTokens: 1,
        outputTokens: 1,
        costUsd: 0,
      }),
    ).rejects.toThrow('unavailable');
    expect(database.insert).not.toHaveBeenCalled();
  });
  it('bounds uncertain request errors', async () => {
    await markAiReservationUncertain('id', 'x'.repeat(3000));
    expect(writes).toEqual([
      expect.objectContaining({ status: 'uncertain', error: 'x'.repeat(2000) }),
    ]);
  });
});
