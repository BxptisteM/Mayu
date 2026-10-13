import { z } from 'zod';

const discordIdSchema = z.string().regex(/^\d{17,20}$/, 'Invalid Discord ID');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  TZ: z.string().default('Europe/Paris'),

  DATABASE_URL: z.url().refine((url) => {
    return url.startsWith('postgresql://') || url.startsWith('postgres://');
  }, 'Expected a PostgreSQL connection URL'),

  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_APPLICATION_ID: discordIdSchema,
  DISCORD_GUILD_ID: discordIdSchema,

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openrouter/free'),
  OPENROUTER_MONTHLY_BUDGET_USD: z.coerce.number().positive().max(1).default(0.9),
  OPENROUTER_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(2048),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const errors = z.prettifyError(result.error);
  throw new Error(`Invalid environment configuration:\n${errors}`);
}

export const env = result.data;

export type Environment = z.infer<typeof envSchema>;
