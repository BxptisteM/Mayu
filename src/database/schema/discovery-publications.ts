import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const discoveryPublications = pgTable(
  'discovery_publications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: text('guild_id').notNull(),
    category: text('category').notNull(),
    itemKey: text('item_key').notNull(),
    channelId: text('channel_id').notNull(),
    messageId: text('message_id').notNull().unique(),
    publishedAt: timestamp('published_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('discovery_publications_item_idx').on(table.guildId, table.category, table.itemKey),
    index('discovery_publications_date_idx').on(table.category, table.publishedAt),
  ],
);
