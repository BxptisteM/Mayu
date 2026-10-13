import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { articles } from './articles.js';

export const selections = pgTable(
  'selections',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),

    userId: text('user_id').notNull(),
    guildId: text('guild_id').notNull(),

    selectedAt: timestamp('selected_at', {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('selections_user_article_guild_idx').on(
      table.userId,
      table.articleId,
      table.guildId,
    ),
    index('selections_user_guild_idx').on(
      table.userId,
      table.guildId,
    ),
  ],
);
