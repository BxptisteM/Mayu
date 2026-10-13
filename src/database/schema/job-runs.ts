
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const jobStatusEnum = pgEnum('job_status', [
  'running',
  'success',
  'failed',
]);

export const jobTriggerEnum = pgEnum('job_trigger', [
  'cron',
  'manual',
]);

export const jobRuns = pgTable(
  'job_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    job: text('job').notNull(),

    trigger: jobTriggerEnum('trigger').notNull(),
    status: jobStatusEnum('status').notNull().default('running'),

    articlesFetched: integer('articles_fetched').notNull().default(0),
    articlesPublished: integer('articles_published').notNull().default(0),

    error: text('error'),

    startedAt: timestamp('started_at', {
      withTimezone: true,
    }).notNull().defaultNow(),

    finishedAt: timestamp('finished_at', {
      withTimezone: true,
    }),
  },
  (table) => [
    index('job_runs_job_started_idx').on(table.job, table.startedAt),
  ],
);
