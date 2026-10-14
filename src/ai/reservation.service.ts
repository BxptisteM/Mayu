import { and, eq, gte, lt, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../database/client.js';
import {
  aiReservations,
  aiUsages,
} from '../database/schema/index.js';

export type AiOperation =
  | 'article_summary'
  | 'markdown_summary';

function monthBounds(now: Date): {
  start: Date;
  end: Date;
} {
  return {
    start: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ),
    end: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ),
  };
}

export interface Reservation {
  id: string;
  reservedUsd: number;
}

export function estimateMaximumCost(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    inputTokens * env.OPENROUTER_INPUT_USD_PER_MILLION +
    outputTokens * env.OPENROUTER_OUTPUT_USD_PER_MILLION
  ) / 1_000_000;
}

export async function reserveAiBudget(
  operation: AiOperation,
  model: string,
  amountUsd: number,
): Promise<Reservation> {
  if (
    !Number.isFinite(amountUsd) ||
    amountUsd < 0
  ) {
    throw new Error('Invalid AI reservation amount');
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtext('mayu:ai:monthly-budget')
      )
    `);

    const { start, end } = monthBounds(new Date());

    const [usage] = await tx
      .select({
        total: sql<string>`
          COALESCE(SUM(${aiUsages.costUsd}), 0)
        `,
      })
      .from(aiUsages)
      .where(
        and(
          gte(aiUsages.createdAt, start),
          lt(aiUsages.createdAt, end),
        ),
      );

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

    const spentUsd = Number(usage?.total ?? 0);
    const reservedUsd = Number(pending?.total ?? 0);

    const available =
      env.OPENROUTER_MONTHLY_BUDGET_USD -
      spentUsd -
      reservedUsd;

    if (amountUsd > available) {
      throw new Error(
        'Insufficient OpenRouter monthly budget',
      );
    }

    const active = await tx
      .select({ id: aiReservations.id })
      .from(aiReservations)
      .where(eq(aiReservations.status, 'reserved'));

    if (
      active.length >=
      env.OPENROUTER_MAX_CONCURRENT_REQUESTS
    ) {
      throw new Error(
        'OpenRouter concurrency limit reached',
      );
    }

    const [reservation] = await tx
      .insert(aiReservations)
      .values({
        operation,
        model,
        reservedUsd: amountUsd.toFixed(10),
      })
      .returning({ id: aiReservations.id });

    if (!reservation) {
      throw new Error('Failed to create AI reservation');
    }

    return {
      id: reservation.id,
      reservedUsd: amountUsd,
    };
  });
}

export async function markAiReservationUncertain(
  reservationId: string,
  error: string,
): Promise<void> {
  await db
    .update(aiReservations)
    .set({
      status: 'uncertain',
      error: error.slice(0, 2000),
      completedAt: new Date(),
    })
    .where(eq(aiReservations.id, reservationId));
}

export async function completeAiReservation(
  reservationId: string,
  operation: AiOperation,
  result: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  },
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtext(${`mayu:ai:reservation:${reservationId}`})
      )
    `);

    const [current] = await tx
      .select()
      .from(aiReservations)
      .where(eq(aiReservations.id, reservationId))
      .limit(1);

    if (!current || current.status !== 'reserved') {
      throw new Error(
        'AI reservation already finalized or unavailable',
      );
    }

    await tx.insert(aiUsages).values({
      model: result.model,
      operation,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd.toFixed(10),
    });

    await tx
      .update(aiReservations)
      .set({
        status: 'completed',
        actualUsd: result.costUsd.toFixed(10),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        completedAt: new Date(),
      })
      .where(eq(aiReservations.id, reservationId));
  });
}
