# Deployment

## Current repository status

`Dockerfile` includes `development`, `build` and `production` stages. The production stage uses `node:24-alpine`, installs production-only dependencies, copies `sources.json` and compiled `dist/`, runs as the `node` user and starts `node dist/index.js`.

The checked-in `compose.yaml` builds its **development** target, mounts source code and `node_modules`, runs database migrations as a one-shot service, and runs `npm run dev`. It is **not** a production Compose definition. Do not deploy this Compose file unchanged and claim a hardened production setup.

## Local Compose

```bash
cp .env.example .env
# Populate required IDs/secrets and DB variables
# Fill or remove blank optional assignments; defaults require missing values
# Set OPENROUTER_MAX_OUTPUT_TOKENS=3072 for /summarize
# DATABASE_URL within containers must point at the postgres service

docker compose up --build -d
docker compose ps
docker compose logs -f app
```

The database publishes port 5432 on **127.0.0.1 only** on the host. Services communicate on a dedicated Compose network and use named volumes. The migration service must finish successfully before the app starts.

## Production checklist

1. Provision a PostgreSQL 17 database with credentials restricted to Mayu.
2. Keep Discord/OpenRouter credentials and database password in a deployment-time secret store or local file protected with filesystem permissions. Never bundle them into the image or repository.
3. Build the **production stage**: `docker build --target production -t mayu:local .`.
4. Run migrations as an explicit separate, controlled deployment step using an image/environment with migration tooling; production runtime dependencies alone are insufficient for `drizzle-kit` migration commands.
5. Supply all validated runtime environment variables and restrict container/network/database privileges.
6. Ensure `sources.json` is included (the checked-in Dockerfile does this). Supply `podcasts.json` in the container working directory through a mount or an adjusted image: the checked-in production stage does **not** copy it, and the provider unconditionally reads it. Without it, podcast jobs fail.
7. Run exactly one active scheduler instance unless jobs have been designed for distributed operation.
8. Confirm Discord gateway connectivity, configured guild/channel access, outbound OpenRouter/GitHub/feed connectivity and logging.
9. Back up PostgreSQL and test restoring it before introducing automated deployments.

## CI/CD

As of the inspected `main` branch, no GitHub Actions workflows existed. A proposed pipeline can run static checks/tests on pull requests, build a pinned production image after merges to `main`, push it to a private registry and deploy via a least-privileged runner using restricted SSH or a VPS-side pull mechanism. This is a **proposal**, not a description of current behavior. A deployment mechanism must handle env secrets outside the artifact and migrate/roll back safely.
