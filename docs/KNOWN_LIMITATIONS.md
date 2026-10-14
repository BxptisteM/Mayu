# Known Limitations and Review Points

These are observations of the inspected `main` branch, not necessarily confirmed runtime failures. Prioritize validation before a public release.

1. **Single-guild implementation:** `src/discord/interactions.ts` hard-rejects any guild other than `DISCORD_GUILD_ID`. Commands are registered on that one guild.
2. **Development-oriented Compose:** `compose.yaml` uses development target, source mounts and `npm run dev`; it is not a production deployment recipe.
3. **No committed GitHub Actions:** no `.github/workflows/` directory was present in the inspected tree; no functioning CI/CD should be claimed.
4. **Podcast configuration in production image:** Dockerfile copies `sources.json`, but not `podcasts.json` into the production stage. The provider unconditionally reads this file from the working directory; podcast jobs fail unless the file is supplied separately.
5. **`/more` option mismatch:** command definition offers GitHub among selectable values, but RSS `/more` handler explicitly rejects unsupported categories (`GITHUB` included). Podcasts are not offered.
6. **Mixed day boundaries:** RSS storage quota and discovery publication quota are UTC-based; RSS publication daily quota is Europe/Paris-based.
7. **Bounded Discord recovery:** only the most recent 100 messages are examined for a send marker; absence is not evidence of an unsent publication.
8. **Possible category/guild consistency assumptions:** RSS `articles.isPublished` is global while publication records also carry guild/category; review before multi-guild expansion or multi-category publication.
9. **Manual job bookkeeping:** `job_runs` scheduled executions use the job-runner; slash-triggered jobs are not registered through that helper.
10. **AI cost estimates:** paid model pricing is manually configured, input token estimates are conservative approximations, and uncertain reservations retain budget. `/budget` describes application accounting, not provider billing truth.
11. **Retention is hardcoded:** cleanup uses fixed 30/90-day windows instead of operator-configurable environment settings.
12. **Potential startup dependency:** successful boot requires usable sources configuration and database/Discord connections; a missing, empty or invalid `sources.json` blocks startup. Individual feed reachability is checked during collection, not startup.

13. **Briefing token mismatch:** `/summarize` requests 3,072 output tokens but the source default limit is 2,048. Set `OPENROUTER_MAX_OUTPUT_TOKENS` to at least `3072` to enable it.
14. **Scheduler overlap:** the cron callback does not return the operation promise, so `noOverlap` does not cover the full job duration. RSS/discovery have process-local guards; cleanup does not.
15. **Stranded publication intents:** pending intents are skipped during recovery and block fresh claims. Unreconciled sending intents remain `sending`. No operator retry/reconciliation command exists.
16. **Incomplete RSS job metrics:** scheduled RSS fetched counts are always zero; feed failures are logged separately and do not make the job failure count increase.
17. **Environment template blanks:** blank optional assignments do not activate Zod defaults. Populate them or remove them before starting the app.
18. **Source removal:** deleting a feed from `sources.json` does not disable its persisted database entry. Synchronize it with `enabled: false` instead.
19. **AI concurrency rejection:** excess AI requests fail immediately without queuing or automatic retry; parallel scheduled categories can compete for the default two slots.

For each change, add regression tests and update the relevant documentation file.
