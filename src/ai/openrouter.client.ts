import { z } from 'zod';

import { env } from '../config/env.js';

const completionSchema = z.object({
  model: z.string(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.string().nullable().optional(),
          reasoning: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative(),
    completion_tokens: z.number().int().nonnegative(),
    cost: z.number().nonnegative().optional(),
    completion_tokens_details: z
      .object({
        reasoning_tokens: z.number().int().nonnegative().optional(),
      })
      .optional(),
  }),
});

export interface CompletionResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
}

export interface CompletionMessage {
  role: 'system' | 'user';
  content: string;
}

export async function createCompletion(
  messages: CompletionMessage[],
  maxTokens = env.OPENROUTER_MAX_OUTPUT_TOKENS,
): Promise<CompletionResult> {

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Mayu',
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      stream: false,
      reasoning: {
        effort: 'none',
      },
      usage: {
        include: true,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.text()).slice(0, 500);

    throw new Error(`OpenRouter request failed: HTTP ${response.status} - ${errorBody}`);
  }

  const payload: unknown = await response.json();
  const completion = completionSchema.parse(payload);

  const choice = completion.choices[0];

  if (!choice) {
    throw new Error('OpenRouter returned no completion choice');
  }

  const content = choice.message.content?.trim() ?? '';

  return {
    content,
    model: completion.model,
    inputTokens: completion.usage.prompt_tokens,
    outputTokens: completion.usage.completion_tokens,
    costUsd: completion.usage.cost ?? null,
  };
}
