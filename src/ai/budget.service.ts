import { and, gte, lt, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../database/client.js';
import { aiReservations, aiUsages } from '../database/schema/index.js';

import { monthBounds } from './reservation.service.js';

export interface BudgetStatus {
  limitUsd: number;
  spentUsd: number;
  reservedUsd: number;
  remainingUsd: number;
}

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const { start, end } = monthBounds(new Date());

  const [usage] = await db
    .select({
      total: sql<string>`
        COALESCE(SUM(${aiUsages.costUsd}), 0)
      `,
    })
    .from(aiUsages)
    .where(and(gte(aiUsages.createdAt, start), lt(aiUsages.createdAt, end)));

  const [pending] = await db
    .select({
      total: sql<string>`
        COALESCE(SUM(${aiReservations.reservedUsd}), 0)
      `,
    })
    .from(aiReservations)
    .where(
      and(
        gte(aiReservations.createdAt, start),
        lt(aiReservations.createdAt, end),
        sql`${aiReservations.status} IN ('reserved', 'uncertain')`,
      ),
    );

  const limitUsd = env.OPENROUTER_MONTHLY_BUDGET_USD;
  const spentUsd = Number(usage?.total ?? 0);
  const reservedUsd = Number(pending?.total ?? 0);

  return {
    limitUsd,
    spentUsd,
    reservedUsd,
    remainingUsd: Math.max(0, limitUsd - spentUsd - reservedUsd),
  };
}
