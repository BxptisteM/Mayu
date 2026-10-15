<div align="center">

# Mayu

### Less scrolling. More knowing.

**Your technology radar, delivered straight to Discord.**

Mayu collects and curates technology news, interesting GitHub projects, and podcast episodes-so you can spend less time hunting for updates and more time learning from them.

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Last commit](https://img.shields.io/github/last-commit/BxptisteM/Mayu?style=flat-square)](https://github.com/BxptisteM/Mayu/commits/main/)
[![GitHub stars](https://img.shields.io/github/stars/BxptisteM/Mayu?style=flat-square)](https://github.com/BxptisteM/Mayu/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-informational?style=flat-square)](https://github.com/BxptisteM/Mayu)

**Discover → Filter → Read → Save → Summarize**

[Features](#features) · [Topics](#topics) · [Commands](#slash-commands) · [Automation](#scheduled-jobs) · [Getting started](#getting-started)

</div>

---

## Why Mayu?

**Stay curious. Skip the noise.**

Keeping up with technology means tracking dozens of sources, repositories, releases, and conversations. Mayu brings the most useful discoveries into dedicated Discord channels, giving your tech watch a predictable home instead of another endless feed.

- **Save time:** let scheduled jobs do the repetitive source checking.
- **Stay focused:** browse curated updates by topic rather than sifting through everything.
- **Keep the context:** receive concise AI-generated news summaries alongside links to original articles.
- **Go deeper:** select articles worth revisiting and turn them into a personal Markdown briefing.
- **Discover beyond headlines:** keep an eye on noteworthy GitHub repositories and recent podcast episodes.

> **The signal, not the scroll.**

## Features

| Capability                           | What it does                                                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Curated news**                     | Collects articles from configured RSS sources, filters candidates, and publishes selected news to dedicated topic channels.                  |
| **AI-assisted reading**              | Generates article summaries using OpenRouter, subject to a configurable monthly budget.                                                      |
| **Nine content streams**             | Organizes cybersecurity, AI, operating systems, hardware, devices, technology business, general tech news, GitHub discoveries, and podcasts. |
| **Personal reading list**            | Lets members select published articles for a later recap.                                                                                    |
| **Markdown briefings**               | Turns selected articles into a Markdown report and sends it privately via Discord DM.                                                        |
| **Bilingual editorial content**      | Produces news summaries and Markdown reports in **English or French**, configured per server.                                                |
| **Scheduled and on-demand delivery** | Publishes updates automatically or lets members trigger a category job with slash commands.                                                  |
| **Publication history**              | Tracks article selections, previous publications, and job executions in PostgreSQL to manage repeated deliveries.                            |
| **Budget visibility**                | Exposes OpenRouter usage and remaining budget with `/budget`.                                                                                |

### How it works

```text
RSS sources ────┐
                ├──> Fetch & filter ──> Select ──> Summarize ──> Discord topic channels
GitHub ─────────┤
Podcasts ───────┘                               │
                                                └──> Select articles
                                                        │
                                                        v
                                                    /summarize
                                                        │
                                                        v
                                                Markdown briefing (DM)

               PostgreSQL stores sources, articles, selections and job history.
```

_AI summaries and Markdown briefings apply to news articles; GitHub repositories and podcast episodes use dedicated discovery posts._

## Topics

Nine dedicated streams keep different interests separate:

| Topic                       | Command     | Coverage                                                              |
| --------------------------- | ----------- | --------------------------------------------------------------------- |
| **Cybersecurity**           | `/cyber`    | Security research, vulnerabilities, threats, and defensive practices. |
| **Artificial intelligence** | `/ia`       | AI models, tools, research, and industry developments.                |
| **Operating systems**       | `/os`       | Operating systems, platforms, and related software ecosystems.        |
| **Hardware**                | `/hardware` | Components, computing hardware, and emerging technologies.            |
| **Connected devices**       | `/devices`  | Consumer tech, connected products, and smart devices.                 |
| **Technology business**     | `/business` | Tech companies, strategy, and market developments.                    |
| **General tech news**       | `/news`     | Relevant technology updates across the wider industry.                |
| **GitHub discoveries**      | `/github`   | Noteworthy and trending open-source repositories.                     |
| **Podcasts**                | `/podcasts` | Recent episodes from configured technology podcasts.                  |

News feeds are defined in [`sources.json`](sources.json); podcasts are configured in [`podcasts.json`](podcasts.json).

## Slash commands

All server members can use the content commands in the **configured Discord server**. Changing the server's content language requires the **Manage Server** permission.

| Command                             | Description                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/cyber`                            | Run the cybersecurity news job.                                                                                                                     |
| `/ia`                               | Run the AI news job.                                                                                                                                |
| `/os`                               | Run the operating systems news job.                                                                                                                 |
| `/hardware`                         | Run the hardware news job.                                                                                                                          |
| `/devices`                          | Run the connected devices news job.                                                                                                                 |
| `/business`                         | Run the technology business news job.                                                                                                               |
| `/news`                             | Run the general technology news job.                                                                                                                |
| `/github`                           | Find and publish GitHub repository discoveries.                                                                                                     |
| `/podcasts`                         | Find and publish recent technology podcast episodes.                                                                                                |
| `/more category:<topic>`            | Publish additional, previously unpublished RSS news for the chosen topic (three by default). GitHub and podcasts are not supported by this command. |
| `/summarize`                        | Generate a Markdown briefing from your selected articles and deliver it via DM.                                                                     |
| `/language value:<French\|English>` | Change the language of generated news and Markdown content for the server. **Manage Server** required.                                              |
| `/budget`                           | Show the OpenRouter model, monthly spending limit, usage, reservations, and remaining allowance.                                                    |

**Build your own briefing:** select interesting articles using the buttons on published news posts, then run `/summarize`. Mayu sends the `.md` file to your Discord DMs; your selection is cleared after successful delivery. Make sure your privacy settings allow DMs from the bot.

> The language setting affects generated editorial content-not the slash-command names or technical status messages.

## Scheduled jobs

**Read when you want. Mayu watches in the meantime.**

Mayu runs its scheduler in the **Europe/Paris** timezone. The defaults below can be changed through environment variables.

| Job                   | Default schedule                   | Responsibility                                                                                                  |
| --------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Daily news**        | Every day at **08:00**             | Run collection, selection, and publication for the seven RSS news categories.                                   |
| **GitHub discovery**  | Every day at **08:00**             | Discover and publish selected repositories.                                                                     |
| **Podcast discovery** | Every day at **08:00**             | Discover and publish selected podcast episodes.                                                                 |
| **Database cleanup**  | **03:00 on the 1st of each month** | Remove eligible stale article records, old podcast episodes and GitHub snapshots, and older completed job logs. |

The news and discovery jobs share one daily cron trigger and are processed as separate category jobs. Concurrent runs of the same job are guarded against duplication.

**Configurable defaults:** news selection looks back **24 hours**; the standard daily publishing limit is **5 items per category**, while `/more` requests **3 additional news articles**. Limits and schedules are environment-driven; actual published counts depend on available eligible content.

Cleanup retains selected articles and does not indiscriminately delete configured sources. Database retention rules are implemented in [`src/jobs/cleanup.job.ts`](src/jobs/cleanup.job.ts).

## Technology

| Layer                  | Stack                                      |
| ---------------------- | ------------------------------------------ |
| Runtime                | Node.js 24, TypeScript                     |
| Discord                | discord.js 14                              |
| Data                   | PostgreSQL 17, Drizzle ORM                 |
| Content ingestion      | RSS feeds, GitHub discovery, podcast feeds |
| AI generation          | OpenRouter                                 |
| Scheduling             | node-cron                                  |
| Validation and logging | Zod, Pino                                  |
| Quality                | Vitest, ESLint, Prettier                   |
| Local infrastructure   | Docker, Docker Compose                     |

## Getting started

### Requirements

- Docker Engine and the Docker Compose plugin
- A Discord application and bot token
- A Discord server and channels for the configured content categories
- An OpenRouter API key **if you want AI-generated summaries and briefings**

The project also supports local development with **Node.js 24 or 26** and PostgreSQL. Docker uses Node.js 24; CI validates both versions.

### 1. Clone and configure

```bash
git clone https://github.com/BxptisteM/Mayu.git
cd Mayu
cp .env.example .env
```

Fill in `.env` using [`.env.example`](.env.example), including:

- Discord credentials: `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID`.
- The nine `DISCORD_CHANNEL_*` IDs for the target server.
- Database settings: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and related values.
- Optional OpenRouter settings and scheduling/publishing overrides.

**Never commit `.env` or any production secret.** The Compose setup supplies the internal database URL to containers.

### 2. Start the local stack

```bash
docker compose up --build -d
```

The development Compose stack launches PostgreSQL, runs database migrations, and starts the bot. Watch its logs with:

```bash
docker compose logs -f app
```

### 3. Seed sources and register commands

```bash
docker compose exec app npm run db:seed
docker compose exec app npm run commands:register
```

These commands load configured RSS sources and register the Discord slash commands for the configured server.

### Useful developer commands

```bash
npm run dev                 # Watch-mode development
npm run build               # Compile TypeScript
npm run typecheck           # Check types
npm run lint                # Run ESLint
npm run format:check        # Check formatting
npm test                    # Run Vitest
npm run db:generate         # Generate Drizzle migrations
npm run db:migrate          # Apply migrations
npm run editorial:preview   # Preview news selection
npm run discovery:preview   # Preview discovery candidates
```

Run `npm ci` first when developing outside Docker. The checked-in `package-lock.json` ensures repeatable dependency installation.

The `allowScripts` policy in `package.json` approves the pinned esbuild and fsevents install scripts. If a dependency update introduces a new version, review it with `npm install-scripts ls` before approving its scripts.

Drizzle Kit 0.31.x still pulls in the deprecated `@esbuild-kit/esm-loader` and `@esbuild-kit/core-utils` packages. These upstream deprecation warnings do not prevent installation; the esbuild override keeps their esbuild dependency on the patched 0.25.x line.

## Configuration

The main tuning knobs are defined and validated in [`src/config/env.ts`](src/config/env.ts):

| Variable                        | Default           | Purpose                                                        |
| ------------------------------- | ----------------- | -------------------------------------------------------------- |
| `TZ`                            | `Europe/Paris`    | Process timezone (the scheduler explicitly uses Europe/Paris). |
| `NEWS_CRON_SCHEDULE`            | `0 8 * * *`       | Daily news and discovery trigger.                              |
| `CLEANUP_CRON_SCHEDULE`         | `0 3 1 * *`       | Monthly cleanup trigger.                                       |
| `ARTICLES_LOOKBACK_HOURS`       | `24`              | News collection lookback window.                               |
| `ARTICLES_DAILY_PUBLISH_LIMIT`  | `5`               | Daily publication cap per category.                            |
| `ARTICLES_MORE_PUBLISH_LIMIT`   | `3`               | Additional RSS news requested by `/more`.                      |
| `OPENROUTER_MODEL`              | `openrouter/free` | Default AI model selection.                                    |
| `OPENROUTER_MONTHLY_BUDGET_USD` | `0.9`             | Monthly AI spend ceiling in USD.                               |

For the full set of required variables and their validation rules, see [`.env.example`](.env.example) and [`src/config/env.ts`](src/config/env.ts).

## Project structure

```text
Mayu/
├── src/
│   ├── ai/              # OpenRouter, summaries and budget controls
│   ├── config/          # Environment validation
│   ├── database/        # PostgreSQL client and Drizzle schema
│   ├── discord/         # Commands, interactions, embeds and messages
│   ├── editorial/       # Ranking, relevance and article selection
│   ├── github/          # Repository discovery
│   ├── jobs/            # Scheduled news, discovery and cleanup jobs
│   ├── podcasts/        # Podcast discovery
│   ├── scripts/         # Seeds and development previews
│   ├── services/        # Publication, selections and persistence
│   └── sources/         # RSS collection and source management
├── drizzle/             # Database migrations
├── tests/               # Automated tests
├── sources.json         # RSS source definitions
├── podcasts.json        # Podcast source definitions
├── compose.yaml         # Local development stack
└── Dockerfile
```

## Scope & access

Mayu currently targets a **single configured Discord server** through `DISCORD_GUILD_ID`; interactions from other servers are rejected by the application. All members of that server can use regular content commands, while `/language` requires elevated server permissions.

For self-hosting, provision a Discord bot, a PostgreSQL database, and the required channel IDs. Production deployment and secret handling should be configured separately from the development-oriented Compose stack.

<div align="center">

**Mayu - Know what matters. Ignore the noise.**

_Your daily dose of technology, without the daily hunt._

**BxptisteM**

</div>
