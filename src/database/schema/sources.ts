import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: text('name').notNull(),
    url: text('url').notNull().unique(),
    type: text('type').notNull(),

    tags: text('tags').array().notNull(),

    enabled: boolean('enabled').notNull().default(true),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('sources_tags_idx').using('gin', table.tags)],
);
