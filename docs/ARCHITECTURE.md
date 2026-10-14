# Architecture

## Purpose and runtime

Mayu reduces the manual effort involved in technology monitoring. It discovers recent items from RSS feeds, GitHub repository search and podcast feeds; applies category-specific selection; publishes Discord embeds; and generates AI-backed news summaries and user-specific Markdown briefings.

**Runtime:** Node.js 24, TypeScript (ES modules), discord.js 14, PostgreSQL 17, Drizzle ORM, node-cron, OpenRouter and Pino. The bot is a **single process** with an embedded scheduler. No HTTP API or web frontend is present.

## Dependency boundaries

| Area            | Key paths                                            | Responsibility                                                                             |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Entrypoint      | `src/index.ts`                                       | Bootstraps database, sources, Discord, recovery and scheduler; handles termination signals |
| Discord         | `src/discord/`                                       | Gateway client, guild slash commands, button interactions, message/embed construction      |
| Ingestion       | `src/sources/`                                       | RSS parsing, validation, category classification, source synchronization, limits           |
| Editorial       | `src/editorial/`                                     | Relevance scoring, promotion filtering, event similarity/grouping and source diversity     |
| Discovery       | `src/github/`, `src/podcasts/`                       | GitHub search and podcast episode discovery, ranking                                       |
| AI              | `src/ai/`                                            | OpenRouter completions, response validation, budget reservations and summaries             |
| Services        | `src/services/`                                      | Database-backed selection, settings, publication intents and recovery                      |
| Background work | `src/jobs/`                                          | News/discovery jobs, scheduler, run logs and cleanup                                       |
| Persistence     | `src/database/`, `drizzle/`                          | PostgreSQL tables, migrations and transactional consistency                                |
| Configuration   | `src/config/env.ts`, `sources.json`, `podcasts.json` | Environment validation and configured feeds                                                |

## Startup sequence

1. Load `.env` through `dotenv/config` and validate it with Zod.
2. Connect to PostgreSQL.
3. Synchronize configured RSS sources to the database.
4. Register Discord interaction handlers; connect and await ready state.
5. Inspect previous `pending`, `sending` and `uncertain` publication intents; skip pending entries and reconcile sending/uncertain entries against Discord history.
6. Start the cron scheduler.

`SIGINT` and `SIGTERM` stop scheduled tasks and disconnect the Discord client. Database migration is **not** performed by `src/index.ts`; it must be run separately.

## Design decisions

- Outbound-only connections to Discord, OpenRouter, RSS feeds, GitHub, podcast feeds and PostgreSQL.
- Discord bot connects with `GatewayIntentBits.Guilds`; it does not request message-content intent.
- One target guild is enforced with `DISCORD_GUILD_ID` in command and interaction handlers.
- Destination channels are resolved by category-specific channel IDs.
- PostgreSQL unique indexes, transactions and advisory locks provide several layers of duplicate suppression and concurrency control.
- Publications use durable intent records so an ambiguous Discord send is **not blindly repeated**.

See [Pipelines](PIPELINES.md), [Data model](DATA_MODEL.md), and [Security](SECURITY.md).
