# Sources, Discovery and Editorial Logic

## RSS feeds

`sources.json` is the configured feed catalog. Entries contain `name`, `url`, `type: "rss"`, `tags` (one or more categories) and `enabled`. Schema validation is performed by `src/sources/source-config.ts`: URL must be HTTP(S), names/tags cannot be empty and duplicate URLs are rejected. On startup, `src/sources/source-sync.ts` inserts or updates the configured list in PostgreSQL. Entries removed from the file remain in the database with their previous enablement state; removal alone does not disable collection. Set `enabled: false` and synchronize to disable a feed.

Categories: `CYBER`, `IA`, `OS`, `HARDWARE`, `DEVICES`, `BUSINESS`, `NEWS`, `GITHUB`, and `PODCASTS`. The latter two have dedicated discovery providers, not RSS news jobs.

To add a source, edit `sources.json`, choose meaningful category tags, then restart or run the source seed script after configuring the database. To disable a feed, set `enabled` to `false` rather than deleting history from PostgreSQL.

## RSS processing

`src/sources/collector.ts` fetches enabled, matching RSS feeds with bounded concurrency and fetch timeouts. Candidates outside the configured lookback window, dated in the future, or deemed non-editorial are excluded. Classification is applied before adding the article to the category. `NEWS` specifically accepts unclassified technology-relevant content. URLs are unique at the database layer; article/category pairs are also unique.

`src/editorial/selector.ts` excludes promotional content, ranks by relevance and freshness, groups headlines concerning the same event, excludes events recently published within 72 hours and caps selected articles at two from one source. Selection considers at most 200 recent candidate records per category.

## GitHub and podcasts

`src/github/github.provider.ts` queries GitHub Search for non-archived, non-fork repositories created in the previous seven days with at least ten stars, sorted by stars. It supports an optional `GITHUB_TOKEN` environment variable for API authentication/rate-limit behavior. The bot persists repository information and star-history snapshots.

`podcasts.json` defines podcast feed inputs. `src/podcasts/` fetches and ranks episodes. Discovery deduplication uses the `(guild, category, item key)` identity.

## Publisher advice

Treat external titles, descriptions, RSS URLs and podcast metadata as untrusted. Verify feed permissions and terms of service before adding sources. Mayu posts links and its own descriptions/summaries; it is not a full-content republishing platform.
