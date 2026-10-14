import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

import {
  completeAiReservation,
  estimateMaximumCost,
  markAiReservationUncertain,
  reserveAiBudget,
  type AiOperation,
} from './reservation.service.js';

import {
  createCompletion,
  type CompletionMessage,
} from './openrouter.client.js';

export async function generateAiCompletion(
  operation: AiOperation,
  messages: CompletionMessage[],
  maxOutputTokens: number,
): Promise<string> {
  const model = env.OPENROUTER_MODEL;
  const freeModel =
    model === 'openrouter/free' ||
    model.endsWith(':free');

  if (!freeModel && !env.OPENROUTER_ALLOW_PAID_MODELS) {
    throw new Error(
      'Paid OpenRouter models are disabled',
    );
  }

  if (
    !freeModel &&
    (
      env.OPENROUTER_INPUT_USD_PER_MILLION <= 0 ||
      env.OPENROUTER_OUTPUT_USD_PER_MILLION <= 0
    )
  ) {
    throw new Error(
      'Paid model pricing must be configured',
    );
  }

  if (
    maxOutputTokens >
    env.OPENROUTER_MAX_OUTPUT_TOKENS
  ) {
    throw new Error(
      'Requested output exceeds configured token limit',
    );
  }

  // UTF-8 bytes provide a conservative approximation
  // for common text tokenizers, plus message overhead.
  const estimatedInputTokens =
    messages.reduce(
      (sum, message) =>
        sum + Buffer.byteLength(message.content, 'utf8'),
      0,
    ) + 512;

  if (
    estimatedInputTokens >
    env.OPENROUTER_MAX_INPUT_TOKENS
  ) {
    throw new Error(
      'AI input exceeds configured token limit',
    );
  }

  const estimatedMaximumCost = estimateMaximumCost(
    estimatedInputTokens,
    maxOutputTokens,
  );

  const reservation = await reserveAiBudget(
    operation,
    model,
    estimatedMaximumCost,
  );

  let finalized = false;

  try {
    const result = await createCompletion(
      messages,
      maxOutputTokens,
    );

    if (result.costUsd === null) {
      throw new Error(
        'OpenRouter did not report request cost',
      );
    }

    if (
      result.costUsd >
      reservation.reservedUsd + 0.000000001
    ) {
      logger.error(
        {
          reservationId: reservation.id,
          reservedUsd: reservation.reservedUsd,
          actualUsd: result.costUsd,
        },
        'OpenRouter actual cost exceeded reservation',
      );
    }

    await completeAiReservation(
      reservation.id,
      operation,
      {
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd,
      },
    );

    finalized = true;

    if (!result.content.trim()) {
      throw new Error(
        'OpenRouter returned an empty completion',
      );
    }

    return result.content;
  } catch (error: unknown) {
    if (!finalized) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown AI error';

      try {
        await markAiReservationUncertain(
          reservation.id,
          message,
        );
      } catch (databaseError: unknown) {
        logger.error(
          {
            err: databaseError,
            reservationId: reservation.id,
          },
          'Failed to mark AI reservation uncertain',
        );
      }
    }

    throw error;
  }
}
