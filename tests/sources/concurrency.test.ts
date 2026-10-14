import { describe, expect, it } from 'vitest';
import { mapConcurrent } from '../../src/sources/concurrency.js';

describe('Concurrent source mapping', () => {
  it('limits active requests and preserves input order', async () => {
    let active = 0;
    let peak = 0;
    const result = await mapConcurrent([1, 2, 3, 4], 2, async (value) => {
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
      return value * 2;
    });
    expect(peak).toBe(2);
    expect(result).toEqual([2, 4, 6, 8]);
  });
  it('does not invoke the mapper for an empty list', async () => {
    expect(
      await mapConcurrent([], 3, async () => {
        throw new Error('Unexpected mapping');
      }),
    ).toEqual([]);
  });
  it('propagates mapper failures', async () => {
    await expect(
      mapConcurrent([1], 1, async () => {
        throw new Error('Feed unavailable');
      }),
    ).rejects.toThrow('Feed unavailable');
  });
});
