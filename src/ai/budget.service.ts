import { and, gte, lt, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../database/client.js';
import { aiUsages } from '../database/schema/index.js';

import type { CompletionResult } from './openrouter.client.js';

export type AiOperation = 'article_summary' | 'markdown_summary';

export interface BudgetStatus {
  limitUsd: number;
  spentUsd: number;
  remainingUsd: number;
}

function getMonthBounds(now: Date): {
  start: Date;
  end: Date;
} {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const { start, end } = getMonthBounds(new Date());

  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${aiUsages.costUsd}), 0)`,
    })
    .from(aiUsages)
    .where(and(gte(aiUsages.createdAt, start), lt(aiUsages.createdAt, end)));

  const spentUsd = Number(row?.total ?? 0);
  const limitUsd = env.OPENROUTER_MONTHLY_BUDGET_USD;

  return {
    limitUsd,
    spentUsd,
    remainingUsd: Math.max(0, limitUsd - spentUsd),
  };
}

export async function recordAiUsage(
  operation: AiOperation,
  result: CompletionResult,
): Promise<void> {
  if (result.costUsd === null) {
    throw new Error('OpenRouter did not report request cost; usage cannot be recorded reliably');
  }

  await db.insert(aiUsages).values({
    model: result.model,
    operation,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd.toFixed(10),
  });
}

export async function assertBudgetAvailable(): Promise<void> {
  const budget = await getBudgetStatus();

  if (budget.remainingUsd <= 0) {
    throw new Error('Monthly OpenRouter budget exhausted');
  }
}
