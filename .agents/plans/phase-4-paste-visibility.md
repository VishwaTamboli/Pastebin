# Phase 4: Paste Visibility — Implementation Plan

Planning only. No code implemented. Branch `feature/phase-2-paste-api` untouched
(no branches, commits, pushes, PRs, or merges).

## 1. Current state (inspected)

- Entity `server/src/pastes/paste.entity.ts`: `id` (uuid pk), `content` (text),
  `expiresAt` (nullable `expires_at` timestamp), `createdAt` (`created_at`).
  Convention: camelCase properties, snake_case columns.
- DTO `server/src/pastes/dto/create-paste.dto.ts`: `content` + optional
  `expiresIn`, using the `@ValidateIf((_o, value) => value !== undefined)` +
  `@IsString()` + `@IsIn([...])` pattern (omitted/`undefined` skipped, explicit
  `null` rejected with 400).
- Service `server/src/pastes/pastes.service.ts`: `create()` maps DTO → entity;
  `findOne()` throws `NotFoundException('Paste not found')` for missing or
  expired pastes, never deletes.
- Controller returns the `Paste` entity directly (`POST /pastes` → 201,
  `GET /pastes/:id` → 200, `ParseUUIDPipe` v4, global pipe
  `{ whitelist: true, forbidNonWhitelisted: true }`).
- Migrations applied: `CreatePastes`, `AddExpiresAtToPastes`; standalone
  DataSource, `synchronize: false`, `migration:*` scripts all in place.
- Tests: existing Jest setup (`server/jest.config.js`, `ts-jest`, `npm test`),
  offline unit specs only — `pastes.service.spec.ts` (stubbed repository) and
  `dto/create-paste.dto.spec.ts` (`validate()` + pipe-level specs). No new
  test infrastructure needed.

## 2. Design decisions

- **Column type: `varchar`, not a Postgres enum.** A native enum requires
  `CREATE TYPE` management and complicates future value changes; the codebase
  already validates constrained string sets at the DTO layer (`expiresIn`
  precedent). Entity:
  `@Column({ type: 'varchar', length: 16, default: 'public' }) visibility: PasteVisibility`.
- **Default `public` in three cooperating places** (harmless duplication):
  entity `default: 'public'`, service `dto.visibility ?? 'public'`
  (API source of truth), and the resulting DB column default, which backfills
  all existing rows to `'public'` when the `NOT NULL` column is added.
- **No access-control logic**: both values remain retrievable via direct UUID
  URL; `findOne()` is untouched. No auth, no private pastes (out of scope).
- **Validation mirrors `expiresIn`**: `@ValidateIf(value !== undefined)` +
  `@IsString()` + `@IsIn(['public', 'unlisted'])`, so omitted means default,
  explicit `null`/wrong values mean 400.

## 3. Files to change

| # | File | Change |
|---|------|--------|
| 1 | `server/src/pastes/paste.entity.ts` | Add `visibility` column + `PASTE_VISIBILITIES` const / `PasteVisibility` type (or put the const in the DTO file next to `PASTE_EXPIRATION_DURATIONS` — prefer DTO file for symmetry, entity imports the type) |
| 2 | `server/src/migrations/<ts>-AddVisibilityToPastes.ts` | Generate via `npm run migration:generate -- src/migrations/AddVisibilityToPastes`; review before running |
| 3 | `server/src/pastes/dto/create-paste.dto.ts` | Add optional `visibility` with the `@ValidateIf`/`@IsString`/`@IsIn` pattern and a clear 400 message |
| 4 | `server/src/pastes/pastes.service.ts` | `create()` persists `dto.visibility ?? 'public'`; `findOne()` unchanged |
| 5 | `server/src/pastes/pastes.service.spec.ts`, `server/src/pastes/dto/create-paste.dto.spec.ts` | Extend existing specs (see §5); no new spec files, no new dependencies |
| 6 | `README.md` | Visibility examples + migration note (see §6) |

No changes needed: controller (entity serialization includes `visibility`
automatically), module, `app.module.ts`, `main.ts`, DataSource, `package.json`
(no new dependencies), frontend (out of scope).

## 4. Migration strategy

1. Edit the entity first, then generate from `server/`.
2. Expected diff: single statement,
   `ALTER TABLE "pastes" ADD "visibility" character varying(16) NOT NULL DEFAULT 'public'`.
   Review the file; it must contain no other statements. The `NOT NULL ...
   DEFAULT` form backfills existing rows to `'public'` in one statement —
   safe, no data loss.
3. `npm run migration:run` against local `pastebin` DB; verify with
   `psql pastebin -c "\d pastes"` and `migration:show`.
4. Never enable `synchronize` (both `database.config.ts` and `data-source.ts`
   stay `false`).

## 5. Test strategy (extend existing specs only)

- `pastes.service.spec.ts` (stubbed repo, existing style):
  - create without `visibility` → saved `'public'`;
  - create with `'public'` / `'unlisted'` → saved as given;
  - `findOne` returns `visibility` untouched for both values;
  - regression: expired/null-expiry/missing behavior unchanged.
- `create-paste.dto.spec.ts` (`validate()`):
  - absent `visibility` → valid; `'public'`/`'unlisted'` → valid;
  - `'private'`, `'PUBLIC'`, `''`, non-string, explicit `null` → invalid
    (400 at runtime via global pipe).
- Manual runtime check: create default → `visibility: "public"`; create
  unlisted → 200 GET by UUID; invalid value and unknown field → 400;
  `GET /health` still 200.

## 6. Compatibility risks

- **Existing rows**: backfilled to `'public'` by the column default — matches
  requirement 3 (omitted historically ⇒ public). Safe.
- **Response shape**: additive `visibility` property only; creation, retrieval,
  expiration, and UUID validation logic otherwise untouched.
- **No DB-level constraint**: invalid values are rejected at the API layer;
  direct-SQL writes could bypass it (same posture as `expiresIn`). A `CHECK`
  constraint is noted as optional future hardening — do not add it here, to
  keep the generated migration review trivial.
- **Case sensitivity**: `'PUBLIC'` is rejected (exact match only); document in
  README.

## 7. README updates

- Paste API section: `POST` example with `"visibility": "unlisted"` → 201
  including `"visibility": "unlisted"`; note default `"public"` when omitted;
  note both values GET-able by UUID, no auth in this phase.
- Migrations section already documents generate/run; no new commands needed.

## 8. Commands (implementation step, from `server/`)

```bash
npm run migration:generate -- src/migrations/AddVisibilityToPastes
# review generated SQL: must be only the single ADD COLUMN statement
npm run migration:run
npm test
npm run build
```
