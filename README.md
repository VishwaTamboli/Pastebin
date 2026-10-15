# Pastebin — Phase 7: Testing and Documentation

React + TypeScript + Vite frontend (`client/`) and NestJS + TypeScript backend
(`server/`) with PostgreSQL via TypeORM. The backend exposes a Paste API
(create and retrieve pastes, with optional expiration and public/unlisted
visibility); schema changes are applied via migrations.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL running locally

## Installation

```bash
npm run install:all
```

Or per package:

```bash
npm --prefix client install
npm --prefix server install
```

## Environment setup

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Create the database and make sure the credentials in `server/.env` match:

```bash
createdb pastebin
```

`server/.env.example` uses `postgres` / `postgres` on `localhost:5432` as
placeholder values. Replace them with your local PostgreSQL role and password.

### PostgreSQL setup notes

- PostgreSQL must be installed and running before creating the database or
  running migrations.
- The `DATABASE_USER` and `DATABASE_PASSWORD` in `server/.env` must match an
  existing local PostgreSQL role and its password.
- If connection fails, check your local PostgreSQL authentication
  configuration (roles, passwords, and `pg_hba.conf` rules). Do not disable
  authentication or weaken security to work around connection errors. The backend uses
TypeORM with `synchronize: false`, so schema changes only happen through
migrations — never automatically.

## Database migrations

Run from `server/` (commands use `server/.env`):

```bash
npm run migration:show    # list applied / pending migrations
npm run migration:run     # apply pending migrations
npm run migration:revert  # revert the most recent migration
npm run migration:generate -- src/migrations/NameHere  # diff entities → new migration
```

Against a production build (`dist/`), point the CLI at the compiled DataSource:

```bash
node_modules/.bin/typeorm -d dist/config/data-source.js migration:run
```

## Startup

Run both frontend and backend together:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:client   # Vite dev server, http://localhost:5173
npm run dev:server   # NestJS with watch mode, http://localhost:3000
```

The frontend has two routes: `/` (create a paste) and `/:id` (view a paste).
It talks to the backend at `VITE_API_URL` (see `client/.env.example`).

Health check:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

## Paste API

```bash
# Create a paste (content: 1 non-whitespace char … 100,000 chars max)
curl -X POST http://localhost:3000/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"hello pastebin"}'
# HTTP 201 {"id":"<uuid>","content":"hello pastebin","visibility":"public","expiresAt":null,"createdAt":"..."}

# Create a paste that expires (expiresIn: 10m, 1h, 1d, or 7d; omit for no expiration)
curl -X POST http://localhost:3000/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"temporary","expiresIn":"1h"}'
# HTTP 201 {"id":"<uuid>","content":"temporary","visibility":"public","expiresAt":"...","createdAt":"..."}
# Unknown body properties and invalid expiresIn values return HTTP 400.

# Create an unlisted paste (visibility: public or unlisted; omit for public)
curl -X POST http://localhost:3000/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"hidden","visibility":"unlisted"}'
# HTTP 201 {"id":"<uuid>","content":"hidden","visibility":"unlisted","expiresAt":null,"createdAt":"..."}
# Invalid visibility values return HTTP 400. Both public and unlisted pastes
# are retrievable through their direct UUID URLs; there is no authentication
# in this phase.

# Retrieve a paste
curl http://localhost:3000/pastes/<uuid>
# HTTP 200 {"id":"<uuid>","content":"...","visibility":"...","expiresAt":"...","createdAt":"..."}
# HTTP 400 for a malformed UUID; HTTP 404 when the paste does not exist or has expired
# (expired rows are kept, never auto-deleted)
```

## API docs

With the backend running, interactive Swagger documentation is available at:

- UI: http://localhost:3000/api-docs
- JSON: http://localhost:3000/api-docs-json

It documents the implemented endpoints only (`POST /pastes`,
`GET /pastes/:id`, `GET /health`) with request shapes, response codes, and
validation errors. Raw views, listings, editing, and authentication do not
exist yet and are intentionally undocumented.

## Tests

```bash
npm --prefix server test
```

Offline Jest unit tests (no database needed) covering paste creation,
expiration mapping, visibility defaults and values, expired/non-expired
retrieval, DTO validation, and rejection of unknown request properties.

API integration tests (need a local PostgreSQL `pastebin_test` database):

```bash
createdb pastebin_test
npm --prefix server run test:e2e
```

These boot the real application against `pastebin_test` (migrations run
automatically) and cover health, paste creation, validation errors, retrieval,
expired/missing/malformed IDs, visibility, and rate limiting. The development
`pastebin` database is never touched.

## Security

- **Expired-paste cleanup**: an in-process hourly job deletes rows whose
  `expires_at` has passed (never-expiring rows are untouched). Expired pastes
  already return 404 before deletion.
- **Content limits**: paste content is capped at 100,000 characters (HTTP 400
  when exceeded); the JSON request body is capped at 1mb (HTTP 413).
- **Rate limiting**: paste endpoints allow `THROTTLE_LIMIT` requests (default
  10) per `THROTTLE_TTL_MS` window (default 60,000ms) per IP; exceeding the
  limit returns HTTP 429. `GET /health` is exempt.
- **CORS**: allowed origins come from `CLIENT_URL` (comma-separated for
  multiple production origins); empty configuration fails startup in
  production. Pasted content is rendered as text only and all database access
  uses parameterized TypeORM operations. Authentication and private pastes are
  planned for a later phase.

Frontend Vitest tests (no backend needed):

```bash
npm --prefix client test
```

Covers the API payload mapping, typed API errors, and the create/view page
states with a mocked `fetch`.

## Build

```bash
npm run build
```

This builds `client/` (TypeScript + Vite) and `server/` (NestJS) in turn.
