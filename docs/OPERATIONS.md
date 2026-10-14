# Operations, Observability and Recovery

## Health checks

- `docker compose ps` and `docker compose logs -f app` for local Compose deployments.
- Review structured Pino events (`Mayu started successfully`, scheduler start, job completion/failure).
- Verify PostgreSQL connectivity and Discord bot readiness, not merely whether the Node process is alive.
- Query `job_runs` for scheduled history and publication failure counts. RSS fetched counts are always zero, and RSS feed failures require checking collector logs separately.
- The `Mayu started successfully` log occurs before publication recovery and scheduler initialization; also verify scheduler startup.
- Inspect `publication_intents` in `pending`, `sending` and `uncertain` states, and uncertain `ai_reservations`, before considering retries.

## Incident response

| Symptom                  | Check first                                                            | Safe response                                                               |
| ------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| No scheduled posts       | Cron expression/timezone, process running, job logs                    | Fix configuration; avoid overlapping duplicate instances                    |
| Bot ignores a command    | `DISCORD_GUILD_ID`, registered command version, permissions            | Re-register guild commands and verify target server                         |
| RSS category empty       | Source tags, enabled flags, feed reachability, age filter              | Inspect `sources.json`, collector logs and editorial selection              |
| AI summarization fails   | OpenRouter key, model selection, output limits, remaining reservations | Inspect `/budget` and safe logs; do not expose credentials                  |
| `/summarize` DM fails    | User's DM permissions                                                  | Allow DMs and rerun; selections remain intact                               |
| Publication uncertain    | Intent ID, channel, marker, latest 100 channel messages                | Verify actual Discord messages before any manual state change               |
| Database migration fails | Migration history, DB credentials, schema drift                        | Stop release and restore/test from backups; do not delete migration history |

## Duplicate protection and recoverability

`publication_intents` records one identity per `(kind, guild, category, item key)`. Upon error, an intent can remain uncertain. Startup reconciliation examines the latest 100 channel messages for a matching marker from the bot. If the message is outside that window, the result remains uncertain; a human must reconcile without causing double posts. Do not simply delete uncertain intents.

Pending intents are skipped by recovery but block another claim for the same identity. Sending intents with no recovered marker remain `sending`; the recovery result counts them as uncertain without changing their database status. Inspect all three unresolved states. There is no built-in operator command to retry or reconcile them; any repair requires reviewing the intent, database history and Discord delivery before making a controlled state change.

`/summarize` requires `OPENROUTER_MAX_OUTPUT_TOKENS >= 3072`; the default `2048` fails before an OpenRouter request. AI concurrency limits reject excess requests immediately, so consult logs for concurrency failures as well as `/budget`.

## Backup/restore

Back up PostgreSQL, not only the application source tree: it holds article history, selections, publication intents, budget records and scheduled job history. Use encrypted, access-controlled backups and periodically test restore into a separate instance. Keep rollback plans for migrations; application image rollback alone may not restore schema compatibility.

## Logs and secrets

Review error logging for external HTTP bodies and accidental sensitive data. Limit read access to `.env`, deployment credentials, database backups and operational logs. Treat recovered content from RSS and generated summaries as untrusted.
