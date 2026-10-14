import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const publicationIntentStatus = pgEnum('publication_intent_status', [
  'pending',
  'sending',
  'published',
  'uncertain',
]);

export const publicationIntents = pgTable(
  'publication_intents',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    key: text('key').notNull(),
    kind: text('kind').notNull(),
    guildId: text('guild_id').notNull(),
    channelId: text('channel_id').notNull(),
    category: text('category').notNull(),
    itemKey: text('item_key').notNull(),

    status: publicationIntentStatus('status').notNull().default('pending'),
    messageId: text('message_id'),

    error: text('error'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('publication_intents_key_idx').on(table.key),
    index('publication_intents_status_idx').on(table.status),
  ],
);
