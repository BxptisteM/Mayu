import { and, eq, gte, lt, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../database/client.js';
import { aiReservations, aiUsages } from '../database/schema/index.js';
import { logger } from '../shared/logger.js';

export type AiOperation = 'article_summary' | 'markdown_summary';

export interface Reservation {
  id: string;
  reservedUsd: number;
}

export interface AiCompletionUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const BUDGET_LOCK = 'mayu:ai:monthly-budget';
const PRECISION = 10;
const FACTOR = 10 ** PRECISION;

export function monthBounds(now: Date): {
  start: Date;
  end: Date;
} {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

function toStoredMoney(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid AI cost amount');
  }

  return (Math.ceil(amount * FACTOR) / FACTOR).toFixed(PRECISION);
}

export function estimateMaximumCost(inputTokens: number, outputTokens: number): number {
  if (
    !Number.isSafeInteger(inputTokens) ||
    !Number.isSafeInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    throw new Error('Invalid token estimate');
  }

  const cost =
    (inputTokens * env.OPENROUTER_INPUT_USD_PER_MILLION +
      outputTokens * env.OPENROUTER_OUTPUT_USD_PER_MILLION) /
    1_000_000;

  return Number(toStoredMoney(cost));
}

export async function reserveAiBudget(
  operation: AiOperation,
  model: string,
  amountUsd: number,
): Promise<Reservation> {
  const normalizedAmount = toStoredMoney(amountUsd);

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtext(${BUDGET_LOCK}))
    `);

    const now = new Date();
    const { start, end } = monthBounds(now);

    // A request cannot remain active indefinitely after a crash.
    // Its financial outcome is unknown, so retain the reservation.
    const staleBefore = new Date(
      now.getTime() - Math.max(env.OPENROUTER_TIMEOUT_MS + 120_000, 180_000),
    );

    const stale = await tx
      .update(aiReservations)
      .set({
        status: 'uncertain',
        error: 'Request interrupted or exceeded its expected lifetime',
        completedAt: now,
      })
      .where(and(eq(aiReservations.status, 'reserved'), lt(aiReservations.createdAt, staleBefore)))
      .returning({ id: aiReservations.id });

    if (stale.length > 0) {
      logger.warn({ count: stale.length }, 'Stale AI reservations marked uncertain');
    }

    const [usage] = await tx
      .select({
        total: sql<string>`
          COALESCE(SUM(${aiUsages.costUsd}), 0)
        `,
      })
      .from(aiUsages)
      .where(and(gte(aiUsages.createdAt, start), lt(aiUsages.createdAt, end)));

    const [pending] = await tx
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

    const [active] = await tx
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(aiReservations)
      .where(eq(aiReservations.status, 'reserved'));

    if ((active?.count ?? 0) >= env.OPENROUTER_MAX_CONCURRENT_REQUESTS) {
      throw new Error('OpenRouter concurrency limit reached');
    }

    const available =
      env.OPENROUTER_MONTHLY_BUDGET_USD - Number(usage?.total ?? 0) - Number(pending?.total ?? 0);

    if (Number(normalizedAmount) > available + 1e-12) {
      throw new Error('Insufficient OpenRouter monthly budget');
    }

    const [reservation] = await tx
      .insert(aiReservations)
      .values({
        model,
        operation,
        reservedUsd: normalizedAmount,
      })
      .returning({ id: aiReservations.id });

    if (!reservation) {
      throw new Error('Failed to create AI reservation');
    }

    return {
      id: reservation.id,
      reservedUsd: Number(normalizedAmount),
    };
  });
}

export async function markAiReservationUncertain(
  reservationId: string,
  error: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtext(${BUDGET_LOCK}))
    `);

    await tx
      .update(aiReservations)
      .set({
        status: 'uncertain',
        error: error.slice(0, 2000),
        completedAt: new Date(),
      })
      .where(and(eq(aiReservations.id, reservationId), eq(aiReservations.status, 'reserved')));
  });
}

export async function completeAiReservation(
  reservationId: string,
  operation: AiOperation,
  result: AiCompletionUsage,
): Promise<void> {
  const actualCost = toStoredMoney(result.costUsd);

  if (
    !Number.isSafeInteger(result.inputTokens) ||
    !Number.isSafeInteger(result.outputTokens) ||
    result.inputTokens < 0 ||
    result.outputTokens < 0
  ) {
    throw new Error('Invalid OpenRouter token usage');
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtext(${BUDGET_LOCK}))
    `);

    const [current] = await tx
      .select()
      .from(aiReservations)
      .where(eq(aiReservations.id, reservationId))
      .limit(1);

    if (!current || current.status !== 'reserved' || current.operation !== operation) {
      throw new Error('AI reservation unavailable or already finalized');
    }

    // Both operations are committed together:
    // either usage and completion exist, or neither exists.
    await tx.insert(aiUsages).values({
      operation,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: actualCost,
    });

    await tx
      .update(aiReservations)
      .set({
        status: 'completed',
        actualUsd: actualCost,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        completedAt: new Date(),
      })
      .where(eq(aiReservations.id, reservationId));
  });
}
