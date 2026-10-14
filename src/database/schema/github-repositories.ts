import { bigint, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const githubRepositories = pgTable('github_repositories', {
  githubId: bigint('github_id', { mode: 'number' }).primaryKey(),
  fullName: text('full_name').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  language: text('language'),
  stars: integer('stars').notNull(),
  forks: integer('forks').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  pushedAt: timestamp('pushed_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
