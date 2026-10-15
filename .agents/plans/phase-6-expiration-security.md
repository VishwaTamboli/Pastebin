# Phase 6 — Expiration and Security: Implementation Plan

Planning only. No code implemented. No branches created, no commits, no Git
state changes beyond `git fetch origin` (read-only; remote-tracking refs only).

## 0. Git status and mandatory workflow position — STOP, READ FIRST

- Current branch: `feature/pastebin-core` (all Phase 2–5 work lives here).
- Working tree contains **uncommitted user changes** (460 insertions, no
  deletions), all additive:
  - `.opencode/commands/setup-project.md` (+11)
  - `.opencode/skills/project-setup/SKILL.md` (+92)
  - `pastebin.md` (+357 — the full project spec; was empty in earlier phases)
- `git fetch origin` completed. `origin/dev` exists (`890cb0f`); local `dev`
  is in sync with it (0 ahead / 0 behind). No stashes.
- Per the task rules, **stop before switching branches**: the
  `feature/phase-6-expiration-security` branch must NOT be created until the
  owner resolves the uncommitted work above (commit it on the current branch
  or stash it). Implementation step 0 below assumes a clean tree on a fresh
  branch cut from latest `dev` — but note the risk in §8: cutting Phase 6 from
  `dev` will NOT contain the Phase 2–5 code (which is unmerged on
  `feature/pastebin-core`). The implementer must confirm with the owner whether
  Phase 6 should instead branch from `feature/pastebin-core`, or wait until
  that work merges to `dev`. Do not silently carry changes across.

## 1. Current-state inventory (inspected, not modified)

- Entity `server/src/pastes/paste.entity.ts`: `id` uuid pk, `content` text,
  `visibility` varchar(16) default `'public'`, `expiresAt` nullable
  `expires_at` timestamp, `createdAt`. No `@Index` anywhere.
- Migrations (3, all applied): `CreatePastes`, `AddExpiresAtToPastes`,
  `AddVisibilityToPastes`. Standalone DataSource, `synchronize: false`,
  `migration:*` scripts present.
- DTO: `content` (`@IsString`, non-whitespace `@Matches`, `@MaxLength(100_000)`),
  `expiresIn`/`visibility` via `@ValidateIf(!== undefined)` + `@IsIn`;
  global pipe `{ whitelist: true, forbidNonWhitelisted: true }`.
- Controller: `POST /pastes` (201), `GET /pastes/:id` (200 / 400 bad UUID via
  `ParseUUIDPipe` / 404). No raw endpoint, no listing endpoint, no PATCH/DELETE,
  no auth endpoints, no user entity.
- Service: `findOne` 404s missing AND expired pastes with identical message;
  expired rows are never deleted (no cleanup job of any kind).
- `main.ts`: CORS = single-string `origin` from `CLIENT_URL`
  (fallback `http://localhost:5173`), `credentials: true`. **No JSON body-limit
  configuration** — Express default (`100kb`) applies.
- Deps: no `@nestjs/schedule`, no `@nestjs/throttler`, no `helmet`,
  no `supertest`/`@nestjs/testing`. Jest (backend) + Vitest (frontend) exist.
- Env: `server/.env` + `.env.example` (`PORT`, `CLIENT_URL`, `DATABASE_*`);
  `client/.env.example` (`VITE_API_URL`).
- Frontend: typed `lib/api.ts` client; `ViewPage` renders `{paste.content}`
  inside `<pre>` (React-escaped; no `dangerouslySetInnerHTML` observed —
  implementation must confirm with a grep); `CreatePage` posts JSON.
  No auth UI, no listings, no raw view.

## 2. Requirement-by-requirement gap analysis

| Req | Status | Detail |
|-----|--------|--------|
| A. Expired-paste cleanup | **Missing** | No scheduler, no delete path, no `expires_at` index. Plan §3A |
| B. Size limits | **Partial** | DTO `@MaxLength(100_000)` + tests exist. **Gap:** Express JSON body default `100kb` can reject a max-size payload with 413 before validation ever runs (100k chars + JSON overhead ≈ limit). Needs explicit `json({ limit })` + docs. Plan §3B |
| C. Rate limiting | **Missing** | Nothing installed or configured. Plan §3C |
| D. CORS | **Partial** | Single-origin env-based, no wildcard — good posture, but: no multi-origin (prod) support, no documented production values. Plan §3D |
| E. Safe content/DB | **Mostly done** | React escaping, TypeORM repository-only access (no string-built queries), Nest default error hiding. Remaining: verify via grep audit + document posture; no code change expected unless audit finds something. Plan §3E |
| F. Auth tests | **Auth absent (per spec)** | No users, no login, no private pastes, no listing endpoint. Per instructions do NOT build auth; plan regression tests locking in current public behavior. Plan §3F |
| DB migration | Only if needed | One small migration justified: `expires_at` index for cleanup (§4) |
| Docs | Needed | README + `.env.example` updates for cleanup schedule, body limit, throttle vars, CORS (§6) |

Out of scope (observed, not planned): `30d` expiry from pastebin.md §D,
raw-content endpoint, syntax highlighting, titles/languages, auth system,
public listings, edit/delete, Swagger, deployment — all other phases.

## 3. Implementation steps (small, verifiable, in order)

### Step 0 — Git (owner decision required, see §0)
1. Resolve uncommitted work on `feature/pastebin-core`.
2. `git checkout dev && git pull --ff-only origin dev` (or sync per owner).
3. `git checkout -b feature/phase-6-expiration-security` from the agreed base.
   Acceptance: `git status` clean, `git log --oneline -1` shows the base tip.

### Step A — Automatic expired-paste cleanup
- New dep: `@nestjs/schedule` only (in-process cron; no Redis/scheduler infra).
- Files:
  - `server/src/pastes/paste-cleanup.service.ts` (new): `@Injectable()` with
    `@Cron(CronExpression.EVERY_HOUR)` (tunable via env `CLEANUP_CRON` — keep
    the cron string inline if env-plumbing looks over-engineered; decide at
    implementation, default hourly) calling
    `delete({ expiresAt: LessThanOrEqual(new Date()) })`. TypeORM skips NULLs
    in `< =` comparisons, so never-expiring rows are untouched.
  - `server/src/pastes/pastes.module.ts`: import `ScheduleModule.forRoot()`
    (in `AppModule`, once) + register provider.
  - `server/src/pastes/paste.entity.ts`: add
    `@Index('idx_pastes_expires_at', ['expiresAt'])` (supports the delete;
    generates the §4 migration).
- Guarantees: cleanup only deletes already-unreadable rows (`findOne` 404s
  them first); never makes expired pastes accessible (no read-path change).
- Tests (`pastes-cleanup.spec.ts`, stubbed repo): deletes only expired rows
  (expired removed, future + NULL kept — assert `delete` called with
  `LessThanOrEqual` arg); boundary: `expiresAt == now` treated expired
  (consistent with `findOne`'s `<=`).
- Acceptance: unit tests pass; manual: insert expired row, wait/trigger cron
  (or call method via `start:dev` + temporary trigger — document), row gone,
  valid rows intact.

### Step B — Paste-size limits (keep DTO, fix the body limit)
- Keep `MAX_PASTE_CONTENT_LENGTH = 100_000` and all DTO validation unchanged.
- `server/src/main.ts`: `app.use(json({ limit: '1mb' }))` from
  `express` (already a transitive dep via `@nestjs/platform-express`; import
  type-safe `import { json } from 'express'`). 1mb comfortably covers
  100k-char UTF-8 payloads + overhead while still bounding abuse.
- Oversized bodies → Express 413 HTML error (not JSON). Acceptable and
  documented; do NOT build custom error middleware in this phase (keep minimal).
  DTO-level oversize (valid JSON, >100k chars) still returns the existing 400.
- Tests: extend `create-paste.dto.spec.ts` — empty, valid, exactly-100k
  (construct `'x'.repeat(100_000)`), 100_001 → invalid. Body-limit value
  covered by documentation + manual curl (`413` for a >1mb payload).
- README: document `100,000 chars` DTO limit + `1mb` JSON body limit.
- Acceptance: DTO boundary tests pass; manual curl of 100_001-char JSON → 400,
  >1mb body → 413, valid max payload → 201.

### Step C — Rate limiting (in-memory, no Redis)
- New dep: `@nestjs/throttler` only.
- `server/src/app.module.ts`: `ThrottlerModule.forRoot([{ ttl: <ms>, limit: N }])`
  with values from env (`THROTTLE_TTL_MS`, `THROTTLE_LIMIT`, defaults e.g.
  60_000/10) via `ConfigService`; apply `ThrottlerGuard` as `APP_GUARD`
  (protects all routes incl. future ones) or scoped to `POST /pastes` with
  `@UseGuards`/`@Throttle()` — prefer global guard for uniform 429s, exempt
  `GET /health` with `@SkipThrottle()` so monitoring never trips.
- 429 response is the package default JSON (`statusCode: 429`) — suitable,
  no customization.
- Tests: guard-level unit test is low-value without HTTP; no `supertest`
  (avoid new e2e infra). Verify manually: 11 rapid POSTs → 11th is 429;
  health stays 200. Document exact commands in the plan's validation notes.
- README/`.env.example`: `THROTTLE_TTL_MS`, `THROTTLE_LIMIT` documented.
- Acceptance: manual 429 observed; `npm test` still green (no regressions from
  guard wiring — run full suite).

### Step D — CORS (harden, keep env-driven)
- `server/src/main.ts`: parse `CLIENT_URL` as comma-separated list
  (`split(',').map(trim).filter(Boolean)`), pass array to `origin`; keep
  `credentials: true`. Fail-closed: if the parsed list is empty in
  `NODE_ENV=production`, throw at bootstrap (local dev keeps the
  `http://localhost:5173` fallback). Never use `origin: '*'` with credentials.
- `server/.env.example` + README: document comma-separated production origins
  (e.g. `CLIENT_URL=https://app.example.com`), keep localhost default for dev.
- Tests: assert the parsing helper's behavior — extract it to a tiny pure
  function (e.g. `parseAllowedOrigins(value?, fallback?)` in a new
  `server/src/config/cors.config.ts`, unit-tested: multi-origin split,
  whitespace trimming, empty-string handling). E2E Origin-header checks stay
  manual (curl with `-H "Origin: ..."`).
- Acceptance: unit tests pass; manual curl shows `Access-Control-Allow-Origin`
  echo for allowed origin, absent for disallowed.

### Step E — Safe content & DB audit (verify, document, fix only if found)
- Implementation checklist (grep audit, no new deps):
  - `grep -rn "dangerouslySetInnerHTML\|innerHTML" client/src` → must be empty
    (content stays in `<pre>{paste.content}</pre>`).
  - `grep -rn "query(\`\|createQueryBuilder" server/src` → only migrations may
    appear; all runtime access stays repository-based/parameterized.
  - Confirm no secret/stack leakage: Nest production errors hide internals by
    default; `ValidationPipe` messages are static strings; `server/.env` is
    gitignored (verify `.gitignore`, never commit `.env`).
- If the audit is clean: no code change, add a short "Security posture"
  section to README recording the guarantees. If anything is found: fix
  minimally in-phase, add a regression test.
- Acceptance: audit commands recorded with empty/clean output.

### Step F — Auth-absence regression tests (no auth system)
- Assert and document: no `auth/` module, no user entity, no login/session
  code, no listing endpoint exist — nothing to authorization-test yet.
- Add regression specs (extend existing files, no new infra):
  - `pastes.service.spec.ts`: both `public` and `unlisted` retrievable by id;
    expired (past `expiresAt`) → `NotFoundException`; row not deleted by reads.
  - `create-paste.dto.spec.ts` or controller-level note: no `owner`/auth
    fields accepted (unknown props already 400 via `forbidNonWhitelisted` —
    add a case with an `ownerId` body prop → invalid at pipe level).
- README: one line that private pastes/auth arrive in a later phase; unlisted
  URLs are bearer-accessible by design.
- Acceptance: new regression tests pass; full suite green.

## 4. Database and migrations

- Exactly one migration, only if the §3A index is adopted:
  `AddPastesExpiresAtIndex` → `CREATE INDEX "idx_pastes_expires_at" ON
  "pastes" ("expires_at")` (generated from the `@Index` decorator via the
  existing `migration:generate` flow, reviewed, then `migration:run`).
- No table recreations, no column duplication, `synchronize: false` untouched
  in both configs. Down migration drops the index only.

## 5. Testing and validation summary

| Area | Method | Location |
|------|--------|----------|
| Cleanup delete logic + `<=` boundary | Jest, stubbed repo | `paste-cleanup.spec.ts` (new) |
| Size: empty/valid/100k/100001 | Jest `validate()` | extend `create-paste.dto.spec.ts` |
| CORS origin parsing | Jest pure-function | `cors.config.spec.ts` (new) |
| Auth-absence regressions | Jest (service + pipe-level) | extend existing specs |
| Rate limit 429, body-limit 413, CORS headers, cron end-to-end | Manual curl (documented commands) | validation notes, then README |
| Frontend | None affected (no UI change) — run `npm --prefix client test` as regression | — |
| Builds | `npm run build` (root: client + server) | must pass |

New runtime deps total: `@nestjs/schedule`, `@nestjs/throttler`. No Redis,
no supertest, no helmet (rejected as out-of-scope hardening), no new test
frameworks.

## 6. Documentation updates

- README: "Security" section — cleanup schedule (hourly cron in-process),
  content limit (100k chars) + JSON body limit (1mb), throttle defaults,
  CORS origins, safe-rendering/parameterized-access posture, auth-deferred note.
- `server/.env.example`: add `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`
  (+ optional `CLEANUP_CRON` if env-plumbed), multi-origin `CLIENT_URL`
  example. Never commit real `.env`.

## 7. Affected files (expected)

Edits: `server/src/pastes/pastes.service.ts` (none — unless audit finds
something), `server/src/pastes/paste.entity.ts` (`@Index`),
`server/src/pastes/pastes.module.ts` (provider), `server/src/app.module.ts`
(`ScheduleModule`, `ThrottlerModule`, `APP_GUARD`), `server/src/main.ts`
(body limit, CORS parsing), `server/src/pastes/dto/*` (none expected),
`server/package.json` (+lockfile, 2 deps), `README.md`,
`server/.env.example`.
New: `server/src/pastes/paste-cleanup.service.ts`,
`server/src/pastes/paste-cleanup.spec.ts`,
`server/src/config/cors.config.ts` (+ spec),
`server/src/migrations/<ts>-AddPastesExpiresAtIndex.ts`,
extended DTO/service specs.

## 8. Risks and open decisions (owner input needed)

1. **Branch base**: Phase 2–5 code is unmerged on `feature/pastebin-core`;
   cutting Phase 6 from `dev` yields an empty-of-features branch. Confirm base
   branch before Step 0.
2. **Uncommitted work**: `.opencode/*` + `pastebin.md` changes must be
   committed/stashed by the owner first — do not carry silently.
3. **429/413 bodies**: package/Express defaults (JSON 429, HTML 413) —
   consistent enough; custom error shape is deferred to avoid scope creep.
4. **`expires_at` index**: tiny table today; index is for correctness-at-scale
   of the hourly delete. If the owner prefers zero migrations, drop the index
   and this becomes a no-migration phase.
5. **Cron timing**: hourly default; sub-hour testing needs a manual trigger —
   keep the delete logic in a separately callable method for testability.
