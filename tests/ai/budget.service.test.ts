import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBudgetStatus } from '../../src/ai/budget.service.js';
import { resetDatabase, rows } from '../helpers/database.js';
vi.mock('../../src/database/client.js', async () => ({
  db: (await import('../helpers/database.js')).database,
}));
vi.mock('../../src/config/env.js', () => ({ env: { OPENROUTER_MONTHLY_BUDGET_USD: 10 } }));
vi.mock('../../src/shared/logger.js', () => ({ logger: {} }));
beforeEach(resetDatabase);
describe('Monthly budget status', () => {
  it('subtracts spent and reserved amounts', async () => {
    rows.push([{ total: '3.5' }], [{ total: '2' }]);
    expect(await getBudgetStatus()).toEqual({
      limitUsd: 10,
      spentUsd: 3.5,
      reservedUsd: 2,
      remainingUsd: 4.5,
    });
  });
  it('defaults missing aggregate rows to zero', async () => {
    expect(await getBudgetStatus()).toEqual({
      limitUsd: 10,
      spentUsd: 0,
      reservedUsd: 0,
      remainingUsd: 10,
    });
  });
  it('never reports negative available funds', async () => {
    rows.push([{ total: '9' }], [{ total: '2' }]);
    expect(await getBudgetStatus()).toMatchObject({ remainingUsd: 0 });
  });
});
