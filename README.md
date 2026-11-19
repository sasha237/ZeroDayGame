# ZERO DAY

A two-player asymmetric cyber-strategy game: the **Corporation** has superior power but limited visibility, while the **Hackers** have complete visibility but limited resources.

The game supports hot-seat and online play, English and Russian interfaces, private information, facilitator observation, replays, CSV export, and deterministic simulations. The current terminology and mechanics are documented in [Rules](docs/RULES.md) and [Правила на русском](docs/RULES.ru.md).

## Stack

- React 18, TypeScript, and Vite
- Fastify and WebSockets
- PostgreSQL 16 for persistent games, or in-memory storage for local development
- Vitest and Playwright
- Docker for the API and database
- npm workspaces

## Requirements

- Node.js 22 and npm
- Chrome for browser tests and Lighthouse
- Docker with Docker Compose for the PostgreSQL stack (optional)

## Local quick start

Install exact dependency versions from the lockfile:

```bash
npm ci
```

Start the API in one terminal:

```bash
npm run dev:server
```

Start the client in another terminal:

```bash
npm run dev
```

Open **http://127.0.0.1:5173**. The API listens on **http://127.0.0.1:8080**.

By default, the server uses in-memory storage: no database setup is required, but users and games are lost when the API restarts.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

For browser tests, build the client and start the API and preview server:

```bash
npm run build
npm run dev:server
```

In another terminal:

```bash
npm --workspace @aw/client run preview
```

Then run:

```bash
npm run test:e2e
```

The preview is available at `http://127.0.0.1:4173`. Playwright uses the API at `http://127.0.0.1:8080` by default. Set `AW_API_URL` when using a different API address.

## PostgreSQL

Start PostgreSQL and the API together:

```bash
docker compose up --build
```

Or start only the database:

```bash
docker compose up -d postgres
REPO=pg DATABASE_URL=postgres://zero_day:zero_day@127.0.0.1:5432/zero_day npm run dev:server
```

The database migration in `packages/server/migrations/0001_init.sql` runs automatically when the API starts in PostgreSQL mode. The credentials in `docker-compose.yml` are for local development only.

The Compose stack starts the API and PostgreSQL; the web client is run or deployed separately.

## Environment variables

See [`.env.example`](.env.example) for a configuration template. The application does not load `.env` files automatically: provide variables through your shell, Docker, or hosting platform.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | API port |
| `REPO` | `memory` unless PostgreSQL is configured | `memory` or `pg` |
| `DATABASE_URL` | none | PostgreSQL connection URL; required for `REPO=pg` |
| `CLIENT_URL` | `http://127.0.0.1:5173` | Public client URL used in password-reset links |
| `CORS_ORIGIN` | Local development URLs | Comma-separated allowed client origins |
| `TOKEN_TTL_HOURS` | `720` | Session token lifetime |
| `TRUST_PROXY` | `false` | Enable when deployed behind a trusted reverse proxy |
| `EMAIL_API_URL` | none | HTTP email provider endpoint; log-only email when omitted |
| `EMAIL_API_KEY` | none | Email provider credential; never commit it |
| `EMAIL_FROM` | `no-reply@zero-day.local` | Sender address |
| `AW_API_URL` | `http://127.0.0.1:8080` | API proxy target for the client and browser tests |

For a public deployment, set `CLIENT_URL`, `CORS_ORIGIN`, and database credentials explicitly, configure a real email provider, and serve the client and API over HTTPS/WSS.

## Production build

```bash
npm ci
npm run build
npm start
```

`npm start` launches the API from `packages/server/dist/index.js`. Serve `packages/client/dist` with a static web server and proxy `/auth`, `/games`, `/observe`, and `/ws` to the API. The Vite development and preview servers provide these proxies automatically.

## Simulation

```bash
npm run sim -- -n 100 --seed 42 --max-actions 2000 --out sim-report.md
```

This writes Markdown and JSON reports. These files are intentionally excluded from Git. Results describe the included heuristic bots, not predicted human win rates.

## Project layout

```text
packages/
  client/   React interface and client tests
  engine/   Authoritative rules, visibility, victory, and engine tests
  server/   API, persistence, migration, Dockerfile, and server tests
  sim/      Deterministic bots and simulation reports
docs/       Current English/Russian rules and reconstruction context
e2e/        Playwright browser tests
tools/      PostgreSQL smoke test and Lighthouse runner
.github/    Continuous integration
```

## Security and publishing

Do not commit `.env` files, credentials, access tokens, database dumps, `node_modules`, or generated reports. The original archived website, PDFs, and screenshots are not needed to run ZERO DAY and are not included in this repository.
