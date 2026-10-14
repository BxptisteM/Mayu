# Configuration Reference

Copy `.env.example` into a local `.env`. Environment values are validated in `src/config/env.ts` using Zod. Values below are source defaults, **not** deployment-specific secret values. Never commit `.env`.

| Variable                             | Required / default     | Purpose                                                                                   |
| ------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`                           | `development`          | `development`, `production`, `test`                                                       |
| `LOG_LEVEL`                          | `info`                 | Pino log verbosity                                                                        |
| `TZ`                                 | `Europe/Paris`         | Process timezone; cron explicitly uses Paris                                              |
| `DATABASE_URL`                       | Required               | PostgreSQL connection URL                                                                 |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`  | Required by Compose    | PostgreSQL initialization and container `DATABASE_URL` interpolation                      |
| `DB_HOST`, `DB_PORT`                 | Template placeholders  | Currently unused by Compose and runtime validation; configure host/port in `DATABASE_URL` |
| `DISCORD_BOT_TOKEN`                  | Required               | Bot token; secret                                                                         |
| `DISCORD_APPLICATION_ID`             | Required               | Discord application ID                                                                    |
| `DISCORD_GUILD_ID`                   | Required               | Only authorized guild ID                                                                  |
| `DISCORD_CHANNEL_CYBER`              | Required               | Cybersecurity channel ID                                                                  |
| `DISCORD_CHANNEL_IA`                 | Required               | AI channel ID                                                                             |
| `DISCORD_CHANNEL_OS`                 | Required               | OS channel ID                                                                             |
| `DISCORD_CHANNEL_HARDWARE`           | Required               | Hardware channel ID                                                                       |
| `DISCORD_CHANNEL_DEVICES`            | Required               | Devices channel ID                                                                        |
| `DISCORD_CHANNEL_BUSINESS`           | Required               | Business channel ID                                                                       |
| `DISCORD_CHANNEL_NEWS`               | Required               | General news channel ID                                                                   |
| `DISCORD_CHANNEL_GITHUB`             | Required               | GitHub channel ID                                                                         |
| `DISCORD_CHANNEL_PODCASTS`           | Required               | Podcasts channel ID                                                                       |
| `OPENROUTER_API_KEY`                 | Optional syntactically | Required at runtime when AI generation executes                                           |
| `OPENROUTER_MODEL`                   | `openrouter/free`      | OpenRouter model identifier                                                               |
| `OPENROUTER_MONTHLY_BUDGET_USD`      | `0.9`                  | Positive, maximum 1 USD in current schema                                                 |
| `OPENROUTER_MAX_OUTPUT_TOKENS`       | `2048`                 | Upper bound on requested output tokens; `/summarize` requires at least `3072`             |
| `OPENROUTER_MAX_INPUT_TOKENS`        | `8192`                 | Approximate maximum input tokens                                                          |
| `OPENROUTER_TIMEOUT_MS`              | `30000`                | Request timeout, 5000–120000                                                              |
| `OPENROUTER_MAX_CONCURRENT_REQUESTS` | `2`                    | Maximum budget reservations in flight, 1–10                                               |
| `OPENROUTER_INPUT_USD_PER_MILLION`   | `0`                    | Pricing estimate for paid model                                                           |
| `OPENROUTER_OUTPUT_USD_PER_MILLION`  | `0`                    | Pricing estimate for paid model                                                           |
| `OPENROUTER_ALLOW_PAID_MODELS`       | `false`                | Allow paid model after explicit opt-in                                                    |
| `GITHUB_TOKEN`                       | Optional               | GitHub API token, read from process environment                                           |
| `ARTICLES_LOOKBACK_HOURS`            | `24`                   | RSS age limit                                                                             |
| `ARTICLES_MAX_PER_CATEGORY`          | `20`                   | RSS collector UTC day storage quota                                                       |
| `ARTICLES_MAX_PER_SOURCE`            | `5`                    | Per-feed candidate cap                                                                    |
| `ARTICLES_DAILY_PUBLISH_LIMIT`       | `5`                    | Daily publication quota                                                                   |
| `ARTICLES_MORE_PUBLISH_LIMIT`        | `3`                    | `/more` publication limit                                                                 |
| `SOURCES_FETCH_TIMEOUT_MS`           | `15000`                | Feed fetch timeout                                                                        |
| `SOURCES_MAX_CONCURRENCY`            | `4`                    | Parallel RSS fetch count, 1–8                                                             |
| `NEWS_CRON_SCHEDULE`                 | `0 8 * * *`            | All nine daily news/discovery jobs                                                        |
| `CLEANUP_CRON_SCHEDULE`              | `0 3 1 * *`            | Monthly cleanup job                                                                       |

Discord IDs are validated as 17–20 decimal digits. `DATABASE_URL` must start with `postgres://` or `postgresql://`. `.env.example` may not enumerate all valid optional runtime variables; refer to `src/config/env.ts` when updating deployments.

The checked-in `.env.example` contains blank assignments. For settings with defaults, either supply valid values or remove the assignments entirely: Zod defaults apply to missing values, not empty strings. Fill every required value. Set `OPENROUTER_MAX_OUTPUT_TOKENS=3072` or higher for `/summarize`; its fixed request exceeds the source default.

`TZ` is parsed as a configuration value but does not change cron timezone, which is fixed to `Europe/Paris`. Set the process environment timezone externally when needed.

## Example starting workflow

```bash
cp .env.example .env
# Fill required settings; fill or remove blank optional assignments
# Set OPENROUTER_MAX_OUTPUT_TOKENS=3072 for /summarize
# Start PostgreSQL separately and set DATABASE_URL to its reachable address
npm ci
npm run db:migrate
npm run commands:register
npm run dev
```

For Compose, review [Deployment](DEPLOYMENT.md) because the checked-in Compose file is **development-oriented**.
