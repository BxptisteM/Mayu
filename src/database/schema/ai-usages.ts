import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const aiUsages = pgTable(
  'ai_usages',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    model: text('model').notNull(),
    operation: text('operation').notNull(),

    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),

    costUsd: numeric('cost_usd', {
      precision: 14,
      scale: 10,
    }).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    index('ai_usages_created_at_idx').on(table.createdAt),
  ],
);
