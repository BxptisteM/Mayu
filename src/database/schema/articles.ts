import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { sources } from './sources.js';

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'set null' }),

    title: text('title').notNull(),
    url: text('url').notNull().unique(),

    description: text('description'),
    summary: text('summary'),
    summaryLanguage: text('summary_language'),

    publishedAt: timestamp('published_at', {
      withTimezone: true,
    }).notNull(),

    fetchedAt: timestamp('fetched_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('articles_source_idx').on(table.sourceId),
    index('articles_published_at_idx').on(table.publishedAt),
  ],
);
