# User Guide

Mayu posts curated technology updates in topic-specific Discord channels. Read the embeds and follow the original source link for full context. RSS articles include a **Select** action. Selected articles are personal to your Discord account within the server.

## Getting a briefing

1. Browse curated RSS articles in topic channels.
2. Click **Select** on articles of interest. Click again to deselect.
3. Run `/summarize` to request a single Markdown briefing.
4. Check your direct messages for the attached `.md` file.

Briefings require the operator to configure `OPENROUTER_MAX_OUTPUT_TOKENS` to at least `3072`. The default value of `2048` causes `/summarize` to fail before generation.

If DMs are disabled or delivery fails, the bot retains your selections. If there are no selected articles, `/summarize` cannot produce a briefing.

## On-demand refresh

Use `/cyber`, `/ia`, `/os`, `/hardware`, `/devices`, `/business`, or `/news` to run the matching RSS publishing job. `/github` and `/podcasts` run the other discovery jobs. `/more category:<category>` pulls additional unpublished RSS articles from stored candidates, without re-fetching feeds.

Server managers can change the generated content language using `/language value:English` or `/language value:French`. Command acknowledgments and technical labels stay in English; the briefing DM introduction also follows the selected language. GitHub and podcast descriptions retain their source language. `/budget` displays the configured OpenRouter budget state.

Mayu is currently configured for **one authorized Discord server**, not publicly available across arbitrary servers.
