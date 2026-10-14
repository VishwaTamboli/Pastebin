# Pastebin — Phase 4: Paste Visibility

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

`server/.env.example` defaults to user `postgres` / password `postgres` on
`localhost:5432`. Adjust to your local PostgreSQL setup. The backend uses
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

## Tests

```bash
npm --prefix server test
```

Offline Jest unit tests (no database needed) covering paste creation,
expiration mapping, visibility defaults and values, expired/non-expired
retrieval, DTO validation, and rejection of unknown request properties.

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
