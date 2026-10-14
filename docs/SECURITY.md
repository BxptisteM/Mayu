# Security Model

## Trust boundaries

| Boundary                           | Controls in source                                                         | Residual concern                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Discord event → command            | Guild ID check, guild-context commands, `ManageGuild` for `/language`      | App-owner-only installation **is not implemented by this dispatcher**; enforce through Discord installation settings |
| Discord button → stored selection  | Custom ID parsing, guild check, user-specific selection keys               | Must retain message/article binding checks when changing handlers                                                    |
| RSS / external metadata → database | Input normalization, validators, filters, unique URLs                      | Untrusted URLs, malicious content, upstream availability and feed quality                                            |
| Article text → LLM                 | Prompt instructs model to ignore source instructions, uses selected fields | Prompt injection can still affect model output; do not treat model output as authoritative                           |
| LLM → publication                  | Output validation, budget reservations and token accounting                | Model may hallucinate; costs/tariffs can be inaccurate or uncertain                                                  |
| Discord send → database            | Unique publication claim, marker-based reconciliation, transaction lock    | Bounded 100-message recovery cannot prove absence of a sent message                                                  |
| Runtime → secrets                  | `.env` excluded from Git; production Docker stage runs as non-root         | Rotation, secret distribution, VPS host security and logs are operator responsibilities                              |

## Least privilege

The Discord client requests only `Guilds` gateway intent. Bot permissions should be limited to the configured guild and channels, including ability to view channel, send messages, embed links and read recent message history for recovery. The bot needs to DM users for personal Markdown briefings. Avoid the Administrator permission.

PostgreSQL should be reachable only by the application and administrator endpoints, ideally a private Docker network / loopback binding. The checked-in Compose database port binds to `127.0.0.1:5432`, not all host interfaces. Isolate the VPS administration plane separately.

## Operational requirements

- Keep `.env`, `DISCORD_BOT_TOKEN`, `OPENROUTER_API_KEY`, `GITHUB_TOKEN` and database credentials out of version control, container images and logs.
- Rotate exposed tokens promptly and store deployment secrets outside CI artifacts.
- Enforce GitHub branch protection, review and passing checks once CI is configured.
- Review new RSS source destinations; do not allow untrusted users to configure arbitrary fetch URLs.
- Review external dependency updates and lockfile changes.
- Audit Discord install/authorization settings independently from bot command permissions.

## Security limitations

The current version is a **single-guild bot**. No publicly reachable application HTTP service is present. No audited penetration-test results, formal security certification, distributed lock guarantees or completed production CI/CD are established by the inspected code.
