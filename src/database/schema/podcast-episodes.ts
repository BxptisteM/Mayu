import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const podcastEpisodes = pgTable(
  'podcast_episodes',
  {
    id: text('id').primaryKey(),
    podcastName: text('podcast_name').notNull(),
    guid: text('guid').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    description: text('description').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('podcast_episodes_published_idx').on(table.publishedAt)],
);
