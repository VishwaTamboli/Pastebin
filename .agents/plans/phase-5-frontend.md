# Phase 5: Pastebin-Style Frontend — Implementation Plan

Planning only. No code implemented. Branch `feature/phase-2-paste-api` untouched
(no branches, commits, pushes, PRs, or merges).

## 1. Current state (inspected)

- Entry: `client/src/main.tsx` renders `App` (StrictMode); `client/src/App.tsx`
  is a Phase 1 placeholder showing backend `/health` status only.
- Styling: Tailwind CSS v3 (`@tailwind` directives in `src/index.css`,
  `content: ['./index.html', './src/**/*.{ts,tsx}']`). No component library.
- Routing: none. No `react-router` dependency; no routing code of any kind.
- API integration: direct `fetch` to `import.meta.env.VITE_API_URL`
  (fallback `http://localhost:3000`); `.env.example` documents `VITE_API_URL`.
- Build: `tsc -b && vite build` with strict flags — `verbatimModuleSyntax`
  (type-only imports required), `noUnusedLocals`/`noUnusedParameters`,
  `erasableSyntaxOnly` (**no enums/namespaces** — use const-object + union-type
  patterns, mirroring the backend DTO style), `jsx: react-jsx`.
  React 19.3. `index.html` title is the Vite default `"client"`.
- Tests: no framework in `client/` (no vitest/jest/testing-library).
  Backend contract (frozen for this phase): `POST /pastes`
  `{content, expiresIn?, visibility?}` → 201 `{id, content, visibility,
  expiresAt, createdAt}`; `GET /pastes/:id` → 200 or 400 (bad UUID) / 404
  (missing or expired, indistinguishable); `GET /health`.

## 2. Design decisions

- **Router: add `react-router-dom` (single small dependency).** Justification:
  the view page needs a real UUID route (`/:id`) with param parsing, links, and
  back-navigation; hand-rolled location parsing duplicates router edge cases
  (trailing slashes, encoding) for no benefit. v7 supports React 19.
- **Editor: plain `<textarea>` (monospace, large).** No editor dependency:
  requirement 9 forbids a large one without justification, and nothing here
  (no highlighting, no line numbers) needs one.
- **Paste URLs use the frontend origin** (`window.location.origin + '/' + id`),
  not `VITE_API_URL` — the view route lives in the SPA.
- **State handling per page** (no global store; `useState`/`useEffect` only).

## 3. Files to change

| # | File | Change |
|---|------|--------|
| 1 | `client/package.json` (+ lockfile) | Add `react-router-dom`; test devDeps per §6 |
| 2 | `client/src/lib/api.ts` (new) | `Paste`/`CreatePasteInput` types (const-object unions, `import type`-safe), `API_URL`, `createPaste()` (omits `expiresIn` when Never; always sends `visibility`), `getPaste()` (throws typed `PasteNotFoundError` on 404, `PasteApiError` otherwise), `isUuid()` helper |
| 3 | `client/src/pages/CreatePage.tsx` (new) | Large textarea, expiration select (Never/10m/1h/1d/7d), visibility radio (Public default/Unlisted), Create button; client-side non-empty guard; submitting state; field-level server 400 messages; success panel with paste URL + copy-link button (`navigator.clipboard` with `execCommand` fallback) + "create another" reset |
| 4 | `client/src/pages/ViewPage.tsx` (new) | Reads `:id` via `useParams`; states: loading skeleton, content + metadata (created `toLocaleString`, expires `toLocaleString` or "Never", visibility badge), 404 → "not found or expired" (API cannot distinguish — say so), network failure with retry, malformed UUID message |
| 5 | `client/src/App.tsx` | Replace placeholder with layout (header/nav + `<Routes>`: `/` → CreatePage, `/:id` → ViewPage, `*` → not-found note). Keep the health indicator out (or relegate to footer — decision: remove; backend health is not a user feature) |
| 6 | `client/src/main.tsx` | Wrap in `<BrowserRouter>` (keep StrictMode, css import) |
| 7 | `client/index.html` | Title → `Paste` (generic; no copied branding) |
| 8 | `client/src/lib/*.test.*` + vitest config (new) | Per §6 |
| 9 | `README.md` | Frontend routes, env, run/test commands (see §7) |

Backend: no changes. `client/.env.example`: unchanged (`VITE_API_URL` suffices).

## 4. API integration details

```ts
// POST /pastes — Never maps to omitted field
{ content, ...(expiresIn !== 'never' ? { expiresIn } : {}), visibility }
// 201 → { id, content, visibility, expiresAt: string | null, createdAt: string }
```

- `getPaste`: `fetch(API_URL/pastes/id)`; `!res.ok` → 404 throws
  `PasteNotFoundError`, else `PasteApiError(status, message)`; network failure
  propagates as `TypeError` → UI shows retry.
- Dates arrive as ISO strings; format with `new Date(iso).toLocaleString()`.
- Client-side guards mirror the server (non-empty content, valid selects) for
  instant feedback; server 400 messages are displayed verbatim when they occur.

## 5. UX / states matrix

| Page | State | UI |
|------|-------|----|
| Create | editing | textarea + selects + button (disabled while empty/submitting) |
| Create | submitting | button spinner/disabled, inputs disabled |
| Create | 400 | field-level message from server (`message` array joined) |
| Create | network fail | banner + retry keeps form content |
| Create | success | read-only URL field, Copy (→ "Copied!"), Open link, New paste reset |
| View | loading | skeleton block |
| View | loaded | `<pre>` content, metadata row: created / expires-or-Never / visibility badge |
| View | 404 | "This paste does not exist or has expired." + link home |
| View | bad UUID | same 404 panel (or inline message — implementer's choice, document) |
| View | network fail | error panel + Retry (re-fetch) |

Layout: centered `max-w-3xl` column, responsive (`px-4`, textarea `min-h-[40vh]`);
no branding/logos copied from Pastebin.com.

## 6. Test strategy (minimal Vitest setup, new to client)

No framework exists, so per requirement 12 keep it minimal:
- DevDeps only: `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/user-event` (skip `@testing-library/jest-dom` unless
  wanted — plain assertions suffice).
- Config: `vitest.config.ts` (`environment: 'jsdom'`, include
  `src/**/*.test.{ts,tsx}`); script `"test": "vitest run"`.
- Tests (pure logic + key UI, all with mocked `fetch`):
  - payload builder: Never → `expiresIn` omitted; each duration passed through;
    default `visibility: 'public'`.
  - `getPaste`: 404 → `PasteNotFoundError`; 400/500 → `PasteApiError`;
    network reject propagates.
  - CreatePage: empty submit blocked with message; 400 shows server message.
  - ViewPage: loading → content+metadata; 404 → not-found panel.
- Manual check: `dev:client` + `dev:server`, create public/unlisted/expiring
  pastes, open URLs, expired/missing UUID → 404 panel, stop server → retry panel.

## 7. README updates

- Frontend section: routes (`/` create, `/:id` view), `VITE_API_URL` env note,
  paste URLs are frontend-origin links.
- Commands: `npm run dev:client`, `npm --prefix client test`,
  `npm --prefix client run build`. No backend changes to document.

## 8. Risks

- **Strict TS**: `verbatimModuleSyntax`/`erasableSyntaxOnly`/`noUnusedLocals`
  will fail the build on type-import or enum mistakes — use `import type` and
  const-union patterns throughout; run `npm --prefix client run build` early.
- **Clipboard API** needs secure context/`navigator.clipboard`; localhost is
  fine, but keep the `execCommand` fallback and a visible error path.
- **404 ambiguity**: expired vs missing cannot be distinguished — UI copy must
  say "does not exist or has expired", never "expired".
- **Scope creep**: no syntax highlighting, no recent-pastes list (would need a
  list endpoint that does not exist), no auth/private — all explicitly out.
- **`/:id` vs future routes**: reserve `/` for create; any later static routes
  (e.g. `/about`) must be added *before* `/:id` or constrained with a UUID
  regex — note in code comment.

## 9. Commands (implementation step)

```bash
# from repo root or client/
npm --prefix client install -S react-router-dom
npm --prefix client install -D vitest jsdom @testing-library/react @testing-library/user-event
npm --prefix client test        # or: npm --prefix client run test
npm --prefix client run build
npm run dev                     # manual end-to-end check
```
