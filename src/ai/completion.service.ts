import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

import { createCompletion, type CompletionMessage } from './openrouter.client.js';

import {
  completeAiReservation,
  estimateMaximumCost,
  markAiReservationUncertain,
  reserveAiBudget,
  type AiOperation,
} from './reservation.service.js';

function validateModelConfiguration(): void {
  const model = env.OPENROUTER_MODEL;

  const isFree = model === 'openrouter/free' || model.endsWith(':free');

  if (!isFree && !env.OPENROUTER_ALLOW_PAID_MODELS) {
    throw new Error('Paid OpenRouter models are disabled');
  }

  if (
    !isFree &&
    (env.OPENROUTER_INPUT_USD_PER_MILLION <= 0 || env.OPENROUTER_OUTPUT_USD_PER_MILLION <= 0)
  ) {
    throw new Error('Paid model pricing must be configured');
  }

  if (!env.OPENROUTER_API_KEY?.trim()) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }
}

function estimateInputTokens(messages: CompletionMessage[]): number {
  // Conservative approximation for the current text-only prompts.
  // This is not a model-specific tokenizer.
  const bytes = messages.reduce(
    (sum, message) => sum + Buffer.byteLength(message.content, 'utf8'),
    0,
  );

  return bytes + 512;
}

export async function generateAiCompletion(
  operation: AiOperation,
  messages: CompletionMessage[],
  maxOutputTokens: number,
): Promise<string> {
  validateModelConfiguration();

  if (
    !Number.isSafeInteger(maxOutputTokens) ||
    maxOutputTokens <= 0 ||
    maxOutputTokens > env.OPENROUTER_MAX_OUTPUT_TOKENS
  ) {
    throw new Error('Requested output exceeds configured token limit');
  }

  const estimatedInputTokens = estimateInputTokens(messages);

  if (estimatedInputTokens > env.OPENROUTER_MAX_INPUT_TOKENS) {
    throw new Error('AI input exceeds configured token limit');
  }

  const estimatedMaximumCost = estimateMaximumCost(estimatedInputTokens, maxOutputTokens);

  // Nothing is sent to OpenRouter unless the reservation succeeds.
  const reservation = await reserveAiBudget(operation, env.OPENROUTER_MODEL, estimatedMaximumCost);

  let completed = false;

  try {
    const result = await createCompletion(messages, maxOutputTokens);

    if (result.costUsd === null) {
      throw new Error('OpenRouter did not report the cost of this request');
    }

    if (!Number.isFinite(result.costUsd) || result.costUsd < 0) {
      throw new Error('OpenRouter reported an invalid request cost');
    }

    if (result.costUsd > reservation.reservedUsd + 1e-10) {
      logger.error(
        {
          reservationId: reservation.id,
          model: result.model,
          reservedUsd: reservation.reservedUsd,
          actualUsd: result.costUsd,
        },
        'AI request exceeded its reserved cost',
      );
    }

    // Record usage before validating editorial content.
    // Empty or invalid completions can still consume tokens.
    await completeAiReservation(reservation.id, operation, {
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
    });

    completed = true;

    if (!result.content.trim()) {
      throw new Error('OpenRouter returned an empty completion');
    }

    return result.content.trim();
  } catch (error: unknown) {
    if (!completed) {
      const message = error instanceof Error ? error.message : 'Unknown AI completion error';

      try {
        await markAiReservationUncertain(reservation.id, message);
      } catch (databaseError: unknown) {
        logger.error(
          {
            err: databaseError,
            reservationId: reservation.id,
          },
          'Failed to update uncertain AI reservation',
        );
      }
    }

    throw error;
  }
}
