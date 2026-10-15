# Phase 7 — Testing and Documentation: Implementation Plan

Planning only. No code implemented. No branches created, switched, committed,
or merged. `git fetch origin` completed (remote refs only); `origin/dev`
verified present.

## 0. Git workflow position — STOP, READ FIRST

- Current branch: `feature/phase-6-expiration-security`.
- Phase 6 is **not committed**: all implementation files are uncommitted
  (`M server/src/*`, `M server/package.json`, new migration, new specs,
  `M README.md`, `M server/.env.example`).
- The tree additionally holds **unrelated uncommitted changes** that predate
  Phase 6: `M .opencode/commands/setup-project.md`, `M .opencode/skills/project-setup/SKILL.md`,
  `M pastebin.md` (460 insertions total, all additive).
- Per the task rules, **do NOT create `feature/phase-7-testing-documentation`
  yet**. Required safe handling, in order:
  1. Owner reviews the Phase 6 diff (`git diff` + new files) and commits it on
     the current branch (or requests fixes first).
  2. Owner decides the fate of the unrelated `.opencode/*` + `pastebin.md`
     edits (separate commit, or leave uncommitted — but never mix them into a
     Phase 7 branch silently).
  3. Only with a clean tree, create `feature/phase-7-testing-documentation`
     from the agreed base (`dev`, or current branch if Phase 6 is merged —
     confirm explicitly; `dev` does NOT contain Phase 2–6 work unless merged).
- Never reset, clean, force-push, or discard user changes at any point.

## 1. Current coverage and documentation findings

### Backend Jest (4 suites, 46 tests, all passing)
- `pastes.service.spec.ts`: create (default visibility, explicit values,
  expiry mapping), findOne (null/future/past expiresAt, missing, both
  visibilities retrievable). No-delete-on-read asserted.
- `create-paste.dto.spec.ts`: valid/invalid durations and visibilities,
  100k/100001/empty content boundaries, pipe-level unknown-field and
  `ownerId` rejection.
- `paste-cleanup.spec.ts`: `LessThanOrEqual` criteria, affected counts,
  null-affected handling (stubbed repo, no DB).
- `cors.config.spec.ts`: origin parsing, trimming, dev fallback,
  production fail-closed.
- `npm test` = `jest`, ts-jest, offline. No e2e/integration tests of any kind.

### Frontend Vitest (3 files, 18 tests, all passing)
- `api.test.ts`: payload mapping (Never omitted), typed 404/other errors,
  network failure, `isUuid`.
- `CreatePage.test.tsx`: empty-submit blocked, success URL panel, server-400
  display (mocked fetch).
- `ViewPage.test.tsx`: loaded content + Never expiry, 404 panel, malformed id
  without API call.

### API surface (actual, verified against code)
- `POST /pastes` → 201 (+ DTO 400s, 413 over 1mb body, 429 over throttle).
- `GET /pastes/:id` → 200 / 400 (bad UUID) / 404 (missing or expired).
- `GET /health` → 200 (throttle-exempt).
- No raw endpoint, no listing/search, no PATCH/DELETE, no auth of any kind.

### Docs and config
- README covers install, env, migrations, startup, API examples, tests,
  Security section, build. **Formatting bug**: line 83 renders
  `# {"status":"ok",...}` as a level-1 heading (a `##` marker was lost) — fix
  in Phase 7.
- `server/.env.example` documents PORT, CLIENT_URL (multi-origin),
  THROTTLE_*, DATABASE_*. `client/.env.example` documents VITE_API_URL.
- **No Swagger**: no `@nestjs/swagger` dep, no setup code (verified by grep).
- Lint: `oxlint` script in client only; server has no lint script.
- 4 migrations applied; `synchronize: false`; DataSource + `migration:*`
  scripts present.

## 2. Genuine gaps to address (no duplication of covered behavior)

1. **No API integration/e2e tests** (biggest gap; pastebin.md Phase 7
   explicitly requires them).
2. **No Swagger** (pastebin.md lists it as a dev tool and Phase 7 requires
   API documentation).
3. **Thin controller/health coverage**: no spec touches controllers or the
   404/400 HTTP mapping (only service-level throws).
4. **Frontend**: copy-link interaction, network-error + retry states,
   unlisted badge, and expiry-date (non-"Never") display are untested.
5. **README**: broken heading (§1), missing Swagger access docs; testing
   checklist in `pastebin.md` unmapped to automated coverage.
6. Rate-limit 429 and body-limit 413 verified only manually in Phase 6 —
   automate 429 in e2e (deterministic, see §4); 413 stays manual (sending
   >1mb per test run is wasteful; document the curl command).
7. Auth: absent by design (later phase) — document as dependency, keep existing
   regression tests; raw endpoint, listings, edit/delete likewise out of scope.

## 3. Files likely to change

- New: `server/test/app.e2e-spec.ts` (+ minimal e2e jest config — extend
  existing `jest.config.js` with a second project or a `test/jest-e2e.json`;
  prefer separate config file to keep unit runs untouched), `server/test/setup`
  helpers (test DB bootstrap, per-test cleanup).
- New deps (dev): `supertest`, `@types/supertest`. Runtime: `@nestjs/swagger`
  (brings its own UI). No Redis, no new frameworks, no schema changes
  expected → **no new migration** (state explicitly; add one only if e2e setup
  reveals a genuine need).
- Edits: `server/src/main.ts` (Swagger `DocumentBuilder` + `setup('api-docs')`,
  reuse existing validation/CORS/throttle wiring — e2e boots the real app),
  `server/src/pastes/pastes.controller.ts` + `create-paste.dto.ts`
  (Swagger `@Api*()` decorators only, zero behavior change),
  `server/src/health/health.controller.ts` (`@ApiTags`/response decorators),
  `README.md` (Swagger access, fixed heading, coverage mapping),
  `server/package.json` (deps + `test:e2e` script).
- Frontend: extend `CreatePage.test.tsx` (copy interaction with mocked
  `navigator.clipboard`, network-error path) and `ViewPage.test.tsx`
  (retry path, unlisted badge, dated expiry display). No app-code changes
  expected.

## 4. Test strategy and commands

### A. E2E harness (new, minimal, deterministic, offline-friendly)
- Dedicated database `pastebin_test` (created once: `createdb pastebin_test`;
  never touch dev data). E2E boots the real `AppModule` via
  `@nestjs/testing` — wait, that adds `@nestjs/testing`. Alternative without
  new runtime deps: bootstrap the real app with `NestFactory` in the spec
  (same as `main.ts` minus `listen`, plus `supertest(app.getHttpServer())`).
  Prefer this: **zero new runtime deps**, only dev `supertest`.
- Env isolation: point the e2e process at the test DB
  (`DATABASE_NAME=pastebin_test`, distinct `PORT` unused since no listen),
  run `migration:run` equivalent in setup via the compiled DataSource or
  `dataSource.runMigrations()`; truncate `pastes` between tests
  (`DELETE FROM pastes`, keep `migrations` table intact).
- Throttle determinism: suite uses default limits EXCEPT a dedicated
  throttle spec file booting a second app instance with `THROTTLE_LIMIT=3`
  (env override per-file via `process.env` set before bootstrap) → 4 rapid
  POSTs, 4th is 429. No cross-test bucket leakage by construction.
- Cases (actual routes only): health 200; create 201 (+ response shape keys);
  empty/whitespace → 400; oversized (100001 chars, under body limit) → 400;
  unknown field + `ownerId` → 400; get 200 round-trip; missing → 404;
  expired (insert with past `expires_at` via repo) → 404; malformed UUID → 400;
  unlisted retrievable by URL; throttle 429 (separate file/instance).
- Commands: `npm run test:e2e` (new script: `jest --config ./test/jest-e2e.json`);
  requires local Postgres + `pastebin_test` DB (documented).

### B. Unit additions (existing suites only)
- Controller spec (`pastes.controller.spec.ts`, mocked service): 201 payload
  passthrough, 404 propagation, UUID pipe left to framework (already covered
  manually) — thin, documents the HTTP mapping.
- Frontend additions per §2.4 (mocked fetch/clipboard, deterministic).

### C. Auth (documented, not built)
- Keep `ownerId`-rejection + public/unlisted-retrieval regressions; README
  states auth/private pastes are a later-phase dependency. No auth tests
  beyond that (nothing to test against).

### D. Validation commands
```bash
npm test                    # backend unit (server/)
npm run test:e2e             # backend e2e (server/, needs pastebin_test DB)
npm --prefix client test    # frontend (client/)
npm run build               # root: both production builds
npm --prefix client run lint # oxlint (client has it; server has no lint — note, don't add)
```
- Migration check: `npm run migration:show` clean (no pending).
- Swagger check: boot dev server, `curl /api-docs-json` 200 and open
  `/api-docs` UI; pastebin `POST`/`GET` + schemas visible.

## 5. Swagger and documentation tasks

- Install `@nestjs/swagger`; in `main.ts` build document
  (title/version from package, tags `pastes`/`health`), serve at `/api-docs`
  (+ JSON). Decorate DTO (`@ApiProperty` incl. enums, defaults, maxLength)
  and controller methods (`@ApiCreatedResponse`, `@ApiBadRequestResponse`,
  `@ApiNotFoundResponse`, `@ApiTooManyRequestsResponse` where true).
- Document ONLY implemented endpoints/responses — no raw/list/auth/management
  endpoints (they do not exist).
- README: fix line-83 heading; add "API docs" subsection (local URL +
  JSON URL); extend Tests section with e2e prerequisites (`createdb
  pastebin_test`) and commands; add coverage-vs-`pastebin.md`-checklist
  mapping note (which checklist items are automated, which remain
  manual/future: raw view, highlighting, listings, auth, deployment).

## 6. Risks and dependencies

1. **Git first** (§0): Phase 6 uncommitted + unrelated uncommitted edits —
   no Phase 7 branch until the owner resolves both; wrong base (`dev` lacks
   all feature work) would strand the phase.
2. **E2E DB**: needs a local `pastebin_test` database; CI-less environment —
   document creation, never auto-create/drop dev data; truncate helper must
   target only `pastes`.
3. **`@nestjs/swagger` weight**: brings swagger-ui; acceptable, explicitly
   listed in pastebin.md tooling. If version conflicts with Nest 11 arise,
   pin the compatible v11 line.
4. **Throttle e2e flakiness**: isolated low-limit instance avoids bucket
   bleed; keep that file independent (no shared app).
5. **No new migration anticipated**; if e2e needs one, stop and justify.

## 7. Acceptance criteria (tied to pastebin.md)

- Phase 7 criteria: unit tests for services/validation exist and pass
  (`npm test` green, extended); integration/e2e API tests exist and pass
  (`npm run test:e2e` green: create/retrieve/400s/404s/visibility/expiry/
  throttle/health/persistence-across-restart covered where automatable);
  auth absence documented with regression tests (no auth system built);
  env/DB/migration/startup/test/build/Swagger docs let a new developer run
  everything from README alone; `migration:show` clean; both production
  builds pass; Swagger UI + JSON verified locally.
- Testing-checklist mapping: valid create ✓, empty/oversized ✓ (413 manual),
  IDs ✓, retrieve ✓, 404s ✓, expired ✓ + cleanup (unit + manual) ✓,
  visibility ✓, persistence ✓ (e2e re-read), deployed connectivity ✗
  (Phase 8), raw/highlight/search/auth/private ✗ (other phases — documented,
  not implemented).
- Scope holds: no Redis/microservices/auth/paste-management/raw/listing
  features, no unrelated refactoring, no secrets committed.

## 8. Implementation notes (as built)

- `@nestjs/swagger@12` requires Nest 12 (project is on Nest 11) → pinned
  `@nestjs/swagger@^11.0.0` (11.4.7). No `--force`/`--legacy-peer-deps` used.
- `@nestjs/schedule@12` ships ESM-only, which Jest/ts-jest (CJS) cannot
  `require`. Solved two ways: (a) production code already splits cron trigger
  (`paste-cleanup.scheduler.ts`) from logic (`paste-cleanup.service.ts`), so
  unit tests never import the ESM package; (b) e2e `jest-e2e.json` transforms
  `@nestjs/schedule` via ts-jest (`isolatedModules` in
  `test/tsconfig.e2e.json`) + `transformIgnorePatterns` allowlist; type safety
  is enforced by `tsc --noEmit -p test/tsconfig.e2e.json` folded into the
  `test:e2e` script.
- E2E suites run with `--runInBand`: parallel workers raced on first-time
  `runMigrations` against a fresh `pastebin_test` DB (flaky bootstrap
  failure). Serial runs are deterministic (~0.6s total).
- No throttle cross-talk: the throttle e2e uses its own low-limit app
  instance; the main suite raises the limit to 1000 via `test-env.ts`.
- Plan §1 "broken README heading" was a false alarm: the `# {...}` line sits
  inside a fenced code block, not a real heading — no fix applied.
