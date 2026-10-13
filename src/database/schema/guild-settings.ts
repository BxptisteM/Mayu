import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const languageEnum = pgEnum('language', ['fr', 'en']);

export const guildSettings = pgTable('guild_settings', {
  guildId: text('guild_id').primaryKey(),

  language: languageEnum('language').notNull().default('fr'),

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
});
