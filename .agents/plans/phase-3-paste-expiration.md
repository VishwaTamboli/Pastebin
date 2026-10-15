# Phase 3: Paste Expiration — Implementation Plan

Planning only. No code implemented. Branch `feature/phase-2-paste-api` untouched
(no commits, pushes, merges, or PRs).

## 1. Current state (inspected)

- Entity `server/src/pastes/paste.entity.ts`: `id` (uuid pk), `content` (text),
  `createdAt` (`@CreateDateColumn`, column `created_at`, `timestamp without time zone`).
- DTO `server/src/pastes/dto/create-paste.dto.ts`: `content` only
  (`@IsString`, `@Matches(/\S/)`, `@MaxLength(100000)`).
- Service `server/src/pastes/pastes.service.ts`: `create()` saves `{ content }`;
  `findOne()` throws `NotFoundException('Paste not found')` when missing.
- Controller returns the `Paste` entity directly, so responses are
  `{ id, content, createdAt }` (camelCase props, snake_case columns).
  `GET :id` uses `ParseUUIDPipe({ version: '4' })`.
- Global pipe is `new ValidationPipe({ whitelist: true })`
  (`server/src/main.ts:15`): unknown body properties are **silently stripped**.
  `CreatePasteDto` is the only DTO in the codebase; no endpoint uses query/param
  DTO classes, and `GET /health` / `GET /pastes/:id` carry no body — so adding
  `forbidNonWhitelisted: true` affects only `POST /pastes` request bodies
  (see §5).
- Migrations: `1791969780687-CreatePastes` applied; standalone DataSource at
  `server/src/config/data-source.ts` (single default export — CLI requirement);
  `synchronize: false`; scripts `migration:generate/run/revert/show` exist.
- **No test infrastructure at all**: no `*.spec.ts`/`*.test.*` files, no
  jest/vitest/supertest dependency or script in `server/` or `client/`.
  Requirement 7 ("add or update automated tests") therefore means bootstrapping
  minimal test tooling, not extending existing suites.

## 2. Files to change

| # | File | Change |
|---|------|--------|
| 1 | `server/src/pastes/paste.entity.ts` | Add `@Column({ type: 'timestamp', name: 'expires_at', nullable: true }) expiresAt: Date \| null` |
| 2 | `server/src/migrations/<ts>-AddExpiresAtToPastes.ts` | Generate via `npm run migration:generate -- src/migrations/AddExpiresAtToPastes`; review before running |
| 3 | `server/src/pastes/dto/create-paste.dto.ts` | Add optional `expiresIn` (`@IsOptional() @IsString() @IsIn(['10m','1h','1d','7d'])`). Omitted/`undefined` → skipped by `@IsOptional` (no expiration); explicit `null`/wrong type/unknown string → 400 |
| 4 | `server/src/main.ts` | Extend global pipe to `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` so unknown body properties are rejected with 400 instead of stripped (see §5 impact analysis) |
| 5 | `server/src/pastes/pastes.service.ts` | Map `expiresIn` → `expiresAt = new Date(Date.now() + ms)` on create; in `findOne()`, throw the same `NotFoundException('Paste not found')` when `expiresAt <= new Date()`; never delete the row |
| 5 | `server/src/pastes/pastes.service.spec.ts` (new), `server/src/pastes/dto/create-paste.dto.spec.ts` (new) | Unit tests (see §4) |
| 6 | `server/package.json` (+ lockfile), jest config | Add `jest`, `ts-jest`, `@types/jest` devDeps + `test` script (dev-only, no runtime deps) |
| 7 | `README.md` | Migration + `expiresIn` request examples, unknown-field rejection note (see §6) |

No changes needed: controller (entity serialization picks up `expiresAt`
automatically), module, `app.module.ts`, health endpoint, CORS, DataSource,
frontend (out of scope).

## 3. Migration strategy

1. Edit the entity first, then run `npm run migration:generate -- src/migrations/AddExpiresAtToPastes` from `server/`.
2. Expected diff: `ALTER TABLE "pastes" ADD "expires_at" TIMESTAMP` (nullable,
   no default). Review the file; it must contain no other statements.
3. `npm run migration:run` against local `pastebin` DB; verify with
   `psql pastebin -c "\d pastes"` (nullable `expires_at`) and `migration:show`.
4. Keep `synchronize: false` in both `database.config.ts` and `data-source.ts`.

## 4. Test strategy (new minimal Jest setup)

- Config: `ts-jest`, `testMatch: **/*.spec.ts`, run with `npm test` from `server/`.
  Offline unit tests only — no test database, no supertest (keeps this step small;
  e2e flagged as optional follow-up).
- `pastes.service.spec.ts` with a stubbed repository (`create`/`save`/`findOne`
  as jest fns):
  - create without `expiresIn` → saved `expiresAt` is `null`;
  - each of `10m`/`1h`/`1d`/`7d` → `expiresAt ≈ now + offset` (tolerance ±5s);
  - `findOne` non-expired (future `expiresAt`) → returns paste;
  - `findOne` expired (past `expiresAt`) → rejects `NotFoundException`;
  - `findOne` null `expiresAt` → returns (never expires);
  - `findOne` missing → rejects `NotFoundException`.
- `create-paste.dto.spec.ts` using `validate()` from `class-validator`:
  - absent `expiresIn` → valid; each valid duration → valid;
  - `30s`, `2h`, `1w`, `""`, non-string, explicit `null` → invalid
    (400 at runtime via global pipe).
- Unknown-field rejection test: `validate()` does not apply pipe options, so
  test at the pipe level — instantiate
  `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
  (same options as `main.ts`) and assert transforming
  `{ content: 'x', expiry: '1h' }` as `CreatePasteDto` throws
  `BadRequestException`, while `{ content: 'x' }` passes. Offline, no HTTP.
- Manual runtime check (as in Phase 2): create with `expiresIn: "10m"`, GET before
  expiry → 200 with `expiresAt`; expired row → 404; unknown body property →
  400; `GET /health` still 200.

## 5. Compatibility risks

- **Existing rows**: new column is nullable → all current pastes get `NULL` →
  never expire. Safe, no backfill.
- **Response shape**: additive (`expiresAt: <iso|null>`). Clients doing strict
  object equality could break — acceptable for this API stage.
- **Clock source**: expiry computed and compared with the app-server clock
  (`Date.now()`), not DB `now()` — self-consistent; document that sub-second
  boundary uses expired iff `expiresAt <= now`.
- **Unknown-field rejection (`forbidNonWhitelisted`) — impact analysis**:
  compatible with the existing API. Only `POST /pastes` carries a validated
  body; `GET /health` and `GET /pastes/:id` have no body and no param/query DTO
  classes (route param uses `ParseUUIDPipe`, untouched by this change), so their
  behavior is unchanged. The single behavior change: `POST /pastes` bodies with
  extra properties (e.g. a typo'd `expiry`) now return 400 instead of being
  silently stripped. Valid requests sending only `content` / `expiresIn` are
  unaffected. This closes the silent-never-expires typo hazard from the earlier
  draft.
- **No auto-delete**: expired rows accumulate; a cleanup job is explicitly out
  of scope — note it as future work, do not implement.

## 6. README updates

- Migration section already exists; add the generate command example for this
  migration.
- API section: `POST /pastes` example with `"expiresIn": "1h"` → 201 response
  including `"expiresAt": "<iso>"`; note omitting it yields `"expiresAt": null`
  (never expires); note expired GET → 404 identical to missing; note unknown
  body properties now return 400.

## 7. Exact file list and commands (implementation step)
Files that will change (8 total, all within `server/` except README):
1. `server/src/pastes/paste.entity.ts` (edit)
2. `server/src/migrations/<timestamp>-AddExpiresAtToPastes.ts` (generated)
3. `server/src/pastes/dto/create-paste.dto.ts` (edit)
4. `server/src/main.ts` (edit, one line: pipe options)
5. `server/src/pastes/pastes.service.ts` (edit)
6. `server/src/pastes/pastes.service.spec.ts` + `server/src/pastes/dto/create-paste.dto.spec.ts` (new)
7. `server/package.json` + `server/package-lock.json` (jest devDeps, `test` script) + jest config
8. `README.md` (docs only)

Commands (from `server/` unless noted):
```bash
npm install -D jest ts-jest @types/jest
npm run migration:generate -- src/migrations/AddExpiresAtToPastes
# review generated SQL: must be only ALTER TABLE "pastes" ADD "expires_at"
npm run migration:run
npm test
npm run build
```

## 8. Implementation notes (as built)

- DTO uses `@ValidateIf((_o, value) => value !== undefined)` instead of
  `@IsOptional()`: `@IsOptional()` skips validation for explicit `null`, but
  the plan requires explicit `null` → 400. Verified by a failing-then-passing
  test (`expiresIn: null` invalid, omitted valid).
- Migration generated as `1791974646737-AddExpiresAtToPastes`, reviewed
  (single `ADD "expires_at" TIMESTAMP`, nullable), applied successfully.
