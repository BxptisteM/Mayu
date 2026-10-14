import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const aiReservationStatusEnum = pgEnum(
  'ai_reservation_status',
  ['reserved', 'completed', 'uncertain'],
);

export const aiReservations = pgTable(
  'ai_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    model: text('model').notNull(),
    operation: text('operation').notNull(),

    status: aiReservationStatusEnum('status')
      .notNull()
      .default('reserved'),

    reservedUsd: numeric('reserved_usd', {
      precision: 14,
      scale: 10,
    }).notNull(),

    actualUsd: numeric('actual_usd', {
      precision: 14,
      scale: 10,
    }),

    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),

    error: text('error'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    completedAt: timestamp('completed_at', {
      withTimezone: true,
    }),
  },
  (table) => [
    index('ai_reservations_created_idx').on(table.createdAt),
    index('ai_reservations_status_idx').on(table.status),
  ],
);
