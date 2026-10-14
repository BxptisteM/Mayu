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
  OPENROUTER_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(30000),

  DISCORD_CHANNEL_CYBER: discordIdSchema,
  DISCORD_CHANNEL_IA: discordIdSchema,
  DISCORD_CHANNEL_OS: discordIdSchema,
  DISCORD_CHANNEL_HARDWARE: discordIdSchema,
  DISCORD_CHANNEL_NEWS: discordIdSchema,
  DISCORD_CHANNEL_GITHUB: discordIdSchema,
  DISCORD_CHANNEL_PODCASTS: discordIdSchema,
  DISCORD_CHANNEL_DEVICES: discordIdSchema,
  DISCORD_CHANNEL_BUSINESS: discordIdSchema,

  ARTICLES_LOOKBACK_HOURS: z.coerce.number().int().positive().default(24),
  ARTICLES_MAX_PER_CATEGORY: z.coerce.number().int().positive().default(20),
  ARTICLES_MAX_PER_SOURCE: z.coerce.number().int().positive().default(5),
  ARTICLES_DAILY_PUBLISH_LIMIT: z.coerce.number().int().positive().default(5),
  ARTICLES_MORE_PUBLISH_LIMIT: z.coerce.number().int().positive().default(3),

  SOURCES_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  SOURCES_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(4),

  NEWS_CRON_SCHEDULE: z.string().trim().min(1).default('0 8 * * *'),
  CLEANUP_CRON_SCHEDULE: z.string().trim().min(1).default('0 3 1 * *'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const errors = z.prettifyError(result.error);
  throw new Error(`Invalid environment configuration:\n${errors}`);
}

export const env = result.data;

export type Environment = z.infer<typeof envSchema>;
