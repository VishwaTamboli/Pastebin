# Pastebin — Phase 1: Project Setup

React + TypeScript + Vite frontend (`client/`) and NestJS + TypeScript backend
(`server/`) with PostgreSQL via TypeORM. No application features yet.

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
TypeORM with `synchronize: false` and no entities yet, so it only opens the
connection — it creates no tables.

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

Health check:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

## Build

```bash
npm run build
```

This builds `client/` (TypeScript + Vite) and `server/` (NestJS) in turn.
