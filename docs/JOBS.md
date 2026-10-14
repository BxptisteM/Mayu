# Jobs and Scheduling

Scheduler implementation: `src/jobs/scheduler.ts`; timezone is hardcoded to `Europe/Paris`.

| Job                  | Trigger                 | Work                                      |
| -------------------- | ----------------------- | ----------------------------------------- |
| `news:CYBER`         | `NEWS_CRON_SCHEDULE`    | RSS collection, selection and publication |
| `news:IA`            | Same                    | AI news                                   |
| `news:OS`            | Same                    | Operating systems                         |
| `news:HARDWARE`      | Same                    | Hardware                                  |
| `news:DEVICES`       | Same                    | Consumer devices                          |
| `news:BUSINESS`      | Same                    | Technology business                       |
| `news:NEWS`          | Same                    | General technology                        |
| `discovery:GITHUB`   | Same                    | Search and publish repositories           |
| `discovery:PODCASTS` | Same                    | Fetch and publish podcast episodes        |
| `database:cleanup`   | `CLEANUP_CRON_SCHEDULE` | Remove expired operational data           |

**Default schedules:** `0 8 * * *` (daily at 08:00 Paris time) and `0 3 1 * *` (first day of each month at 03:00 Paris time). Override with the corresponding `.env` values; both are validated via `node-cron`. Jobs share a scheduler callback and are launched with `Promise.allSettled`. Although `noOverlap: true` is configured, the cron callback discards the operation promise and returns immediately, so it does not prevent overlap for the full job duration. RSS and discovery jobs separately reject concurrent runs for the same guild/category through process-local sets. Cleanup has no equivalent guard. None of these provides a distributed job lock across deployments.

Scheduled runs are tracked in `job_runs` with start/finish timestamps, status, counts and errors. The `job_runner` helper records scheduled (`cron`) invocations; manually invoked slash jobs are not automatically recorded in that table via the same helper.

For scheduled RSS jobs, `articles_fetched` is always recorded as `0`; the scheduler does not propagate collection counts. Feed failures are logged by the collector but do not contribute to the job’s publication failure count. A `success` row can therefore coexist with feed failures or zero collected articles. Discovery jobs record their fetched item count; cleanup records zero fetched/published counts.

## Quotas

| Setting                        | Default | Purpose                                       |
| ------------------------------ | ------: | --------------------------------------------- |
| `ARTICLES_LOOKBACK_HOURS`      |      24 | RSS ingestion age                             |
| `ARTICLES_MAX_PER_CATEGORY`    |      20 | New category entries per UTC day              |
| `ARTICLES_MAX_PER_SOURCE`      |       5 | Candidates retained per source per collection |
| `ARTICLES_DAILY_PUBLISH_LIMIT` |       5 | Daily publication slots per category          |
| `ARTICLES_MORE_PUBLISH_LIMIT`  |       3 | Extra selected RSS articles with `/more`      |
| `SOURCES_MAX_CONCURRENCY`      |       4 | Parallel RSS source fetches                   |

## Cleanup retention

- Delete articles fetched over **30 days** ago **only when no selection refers to them**.
- Delete podcast episodes older than **30 days** by publication date.
- Delete GitHub star snapshots captured over **30 days** ago.
- Delete completed/failed job runs older than **90 days**; preserve `running` records.

These are hardcoded in `src/jobs/cleanup.job.ts`, not `.env` settings. Test retention changes before applying them to production databases.
