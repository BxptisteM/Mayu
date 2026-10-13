import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { articles } from './articles.js';

export const publications = pgTable(
  'publications',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),

    category: text('category').notNull(),

    guildId: text('guild_id').notNull(),
    channelId: text('channel_id').notNull(),
    messageId: text('message_id').notNull().unique(),

    publishedAt: timestamp('published_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('publications_article_category_guild_idx').on(
      table.articleId,
      table.category,
      table.guildId,
    ),
    index('publications_published_at_idx').on(table.publishedAt),
  ],
);
