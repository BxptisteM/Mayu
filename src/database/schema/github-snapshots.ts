import { bigint, index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { githubRepositories } from './github-repositories.js';

export const githubSnapshots = pgTable(
  'github_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    githubId: bigint('github_id', { mode: 'number' })
      .notNull()
      .references(() => githubRepositories.githubId, {
        onDelete: 'cascade',
      }),
    stars: integer('stars').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('github_snapshots_repository_time_idx').on(table.githubId, table.capturedAt)],
);
