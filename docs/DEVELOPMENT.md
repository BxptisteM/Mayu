# Development and Testing

## Prerequisites

- Node.js **24.x**, npm and PostgreSQL **17** (or the provided Compose database).
- Discord application/bot credentials and guild-specific channel IDs.
- OpenRouter API key for exercising AI paths.

## Scripts

```bash
npm ci
npm run dev                # tsx watch
npm run build              # emit dist/
npm start                  # run built JavaScript
npm run typecheck
npm run lint
npm run lint:fix
npm run format:check
npm run format
npm test                   # Vitest run
npm run test:watch
npm run commands:register
npm run db:generate
npm run db:migrate
npm run db:check
npm run db:studio
npm run db:seed
npm run collect:test
npm run editorial:preview
npm run discovery:preview
```

## Recommended change workflow

1. Review the responsible module under `src/` and schema in `src/database/schema/`.
2. Add/adjust targeted unit tests under `tests/`; cover failures, duplicates and concurrency boundaries.
3. If schema changes, use Drizzle to generate a migration, inspect the SQL, then run migration against a disposable database.
4. Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
5. Exercise the command in a test Discord guild before production rollout (update guild and channel IDs accordingly).
6. Update these docs if command names, environment variables, job schedules or retention policies change.

## Code conventions

The code uses ESM imports with `.js` extensions in TypeScript source; strict configuration, Zod external-input validation, typed services and English application logs. Persist source schema changes as migrations. Avoid adding accidental Discord public message access, hardcoded tokens or noisy permissions.

## CI/CD status

A Dockerfile and local Compose setup exist, but **no `.github/workflows/` automation was present** in the inspected branch. Do not assume tests or deployment execute on push until a workflow is introduced and verified.
