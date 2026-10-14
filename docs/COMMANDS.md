# Discord Slash Commands

Commands are defined in `src/discord/commands/definitions.ts` and registered as **guild commands** with `npm run commands:register`.

| Command                                               | Effect                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/cyber`                                              | Run cybersecurity RSS news job                                                                                                                                                  |
| `/ia`                                                 | Run artificial intelligence RSS news job                                                                                                                                        |
| `/os`                                                 | Run operating systems RSS news job                                                                                                                                              |
| `/hardware`                                           | Run hardware RSS news job                                                                                                                                                       |
| `/devices`                                            | Run devices / consumer technology RSS news job                                                                                                                                  |
| `/business`                                           | Run technology business RSS news job                                                                                                                                            |
| `/news`                                               | Run general technology RSS news job                                                                                                                                             |
| `/github`                                             | Discover/publish GitHub repositories                                                                                                                                            |
| `/podcasts`                                           | Discover/publish podcast episodes                                                                                                                                               |
| `/more category:<category>`                           | Post additional **already collected**, unpublished RSS articles; configured default is three. GitHub is offered in the option list but is **not supported** by the RSS handler. |
| `/summarize`                                          | Generate Markdown briefing from personally selected RSS articles; deliver via DM                                                                                                |
| `/language value:French` or `/language value:English` | Set guild content language (`fr`/`en`)                                                                                                                                          |
| `/budget`                                             | Display OpenRouter model, spend, reservations and remaining monthly budget                                                                                                      |

## Access control

All registered commands require a guild context. The command dispatcher enforces the configured `DISCORD_GUILD_ID` and rejects commands elsewhere. Any member of the configured guild can use the general commands; `/language` also requires **Manage Server** (`ManageGuild`) permission. Article selection buttons have the same guild boundary.

Command acknowledgments and technical output remain in English. Generated article summaries and Markdown briefing text use the configured French or English language, defaulting to French. A member needs Discord DMs from the bot enabled to receive `/summarize` output. Operators must also set `OPENROUTER_MAX_OUTPUT_TOKENS` to at least `3072`; the source default of `2048` rejects briefing generation.

## Limits and expected behavior

Normal RSS category commands run `daily` mode and honor remaining daily publication slots; a repeat does not promise additional posts. `/more` uses a separate `ARTICLES_MORE_PUBLISH_LIMIT`, selects previously ingested items, and does not collect new feeds. Jobs might publish fewer items when there are insufficient suitable, unpublished candidates, when budget is exhausted, or when external calls fail.

Interactions acknowledge privately (`ephemeral`), while article/discovery results are sent to configured destination channels.
