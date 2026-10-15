# Pastebin — Full-Stack Application Plan

## 1. Project Overview

Build a fully functional Pastebin application that allows users to create, store, share, view, and manage text snippets through unique URLs.

The application should have a modern, responsive interface, a reliable backend API, persistent PostgreSQL storage, and security protections against invalid or malicious input.

## 2. Technology Stack

### Frontend
- React.js
- TypeScript
- Vite
- Tailwind CSS
- Lucide React for icons
- A syntax-highlighting library such as Prism.js

### Backend
- NestJS
- TypeScript
- REST API
- TypeORM
- class-validator and class-transformer

### Database
- PostgreSQL
- TypeORM migrations
- Environment variables for database configuration

### Development Tools
- Git and GitHub CLI
- Postman for API testing
- OpenCode for plan, implementation, and validation
- Swagger for API documentation

## 3. Core Features

### A. Create Paste
- Provide a large text editor.
- Accept a paste title and text content.
- Allow users to select a programming language.
- Support plain text and common programming languages.
- Generate a unique, random paste ID.
- Save the paste to PostgreSQL.
- Display the paste URL after successful creation.
- Provide a copy-to-clipboard action.

### B. View Paste
- Open a paste using its unique URL.
- Display the title, content, language, creation date, and expiration information.
- Render syntax highlighting for supported languages.
- Provide a raw-text view.
- Include a copy-content button.
- Display a clear not-found or expired-paste message when appropriate.

### C. Paste Visibility
Support three visibility options:

- **Public:** Available through public listings and accessible by URL.
- **Unlisted:** Accessible through its unique URL but excluded from public listings.
- **Private:** Accessible only to the authorized owner.

Private pastes must be protected by server-side authorization, not just hidden in the frontend.

### D. Expiration
Allow users to choose:
- Never expire
- 10 minutes
- 1 hour
- 1 day
- 7 days
- 30 days

Expired pastes must not be returned by normal view or raw-content endpoints. Add a cleanup mechanism to remove expired records periodically.

### E. User Authentication
- Register with name, email, and password.
- Log in and log out.
- Hash passwords securely.
- Use authenticated sessions or secure JWT-based authentication.
- Protect owner-only operations.
- Never return password hashes through API responses.

### F. Paste Management
Authenticated users should be able to:
- View their own pastes.
- Edit their own pastes.
- Delete their own pastes.
- Copy paste URLs.
- Search pastes by title.
- Filter by language and visibility.
- See creation and expiration dates.

### G. User Interface
Create a clean, modern interface with:
- Home page and paste editor.
- Paste result page.
- Syntax-highlighted content viewer.
- Login and registration pages.
- User dashboard.
- Responsive navigation.
- Loading states, error messages, and empty states.
- Dark and light themes.
- Accessible forms and keyboard-friendly controls.

## 4. Database Design

### Users Table

| Field | Type | Purpose |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR | User's display name |
| email | VARCHAR | Unique email |
| passwordHash | VARCHAR | Hashed password |
| createdAt | TIMESTAMP | Account creation time |

### Pastes Table

| Field | Type | Purpose |
|---|---|---|
| id | UUID | Primary key |
| pasteId | VARCHAR | Unique public identifier |
| title | VARCHAR | Paste title |
| content | TEXT | Stored text |
| language | VARCHAR | Syntax-highlighting language |
| visibility | ENUM | Public, unlisted, or private |
| expiresAt | TIMESTAMP, nullable | Expiration time |
| ownerId | UUID, nullable | Associated user |
| createdAt | TIMESTAMP | Creation time |
| updatedAt | TIMESTAMP | Last update time |

Add a unique index on `pasteId` and indexes for frequently used filters, such as `ownerId`, `createdAt`, and `expiresAt`.

Use database migrations to create and modify the schema. Do not enable automatic schema synchronization in production.

## 5. API Design

### Paste Endpoints

- `POST /api/pastes` — Create a paste.
- `GET /api/pastes/:pasteId` — Retrieve a paste when visibility and authorization rules allow it.
- `GET /api/pastes/:pasteId/raw` — Retrieve raw text content.
- `PATCH /api/pastes/:pasteId` — Update an authorized owner's paste.
- `DELETE /api/pastes/:pasteId` — Delete an authorized owner's paste.
- `GET /api/pastes/me` — List the authenticated user's pastes.
- `GET /api/pastes/public` — List public pastes with pagination.
- `GET /api/pastes/public?search=example` — Search public pastes.

### Authentication Endpoints

- `POST /api/auth/register` — Create an account.
- `POST /api/auth/login` — Authenticate a user.
- `POST /api/auth/logout` — End the current session.
- `GET /api/auth/me` — Retrieve the authenticated user's profile.

Return appropriate HTTP status codes, validate all request data, and use consistent JSON error responses.

## 6. Suggested Project Structure

```text
pastebin/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
├── server/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── pastes/
│   │   ├── database/
│   │   ├── common/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   └── package.json
├── docs/
│   └── api.md
├── .env.example
├── .gitignore
└── README.md
```

Adjust the structure to match the existing repository if one already exists.

## 7. Implementation Phases

### Phase 1 — Project Setup
- Inspect the existing repository.
- Set up the React and NestJS applications.
- Configure TypeScript, linting, and environment variables.
- Connect PostgreSQL.
- Configure health-check endpoint.
- Verify both applications start successfully.

**Completion criteria:** Frontend and backend run locally, and the backend can connect to PostgreSQL.

### Phase 2 — Database and Paste API
- Create the User and Paste entities.
- Add and run database migrations.
- Implement paste creation and retrieval.
- Generate collision-resistant paste IDs.
- Implement expiration checks.
- Add raw-content retrieval.
- Validate request data and handle errors.

**Completion criteria:** Paste creation and retrieval work through Postman, and records persist after server restarts.

### Phase 3 — Paste Editor and Viewer
- Build the home page and editor.
- Add title, content, language, visibility, and expiration inputs.
- Integrate the create-paste API.
- Display the resulting shareable URL.
- Build the paste viewer and raw view.
- Add syntax highlighting and copy actions.

**Completion criteria:** A user can create a paste and open its shareable URL in a separate browser session.

### Phase 4 — Authentication
- Implement registration and login.
- Hash passwords.
- Configure secure authentication.
- Add the authenticated-user endpoint.
- Protect private pastes and owner-only actions.

**Completion criteria:** Unauthorized users cannot access private pastes or manage another user's pastes.

### Phase 5 — Paste Management
- Implement edit and delete operations.
- Add the user's dashboard.
- Implement search, filters, and pagination.
- Add public-paste listing.
- Verify visibility rules across all endpoints.

**Completion criteria:** Users can manage their own pastes, while public listings exclude unlisted and private pastes.

### Phase 6 — Expiration and Security
- Add automatic expired-paste cleanup.
- Enforce paste size limits.
- Add request rate limiting.
- Configure CORS correctly.
- Prevent SQL injection through safe database operations.
- Escape or safely render pasted content.
- Add authentication and authorization tests.

**Completion criteria:** Expired content is inaccessible, invalid input is rejected, and protected resources cannot be accessed without permission.

### Phase 7 — Testing and Documentation
- Write unit tests for paste services and validation.
- Write integration or end-to-end tests for API endpoints.
- Test authentication, authorization, visibility, and expiration.
- Document environment variables and database setup.
- Generate Swagger API documentation.
- Add installation and deployment instructions to README.

**Completion criteria:** All required tests pass and a new developer can run the project using the documentation.

### Phase 8 — Deployment
- Deploy the frontend to Vercel.
- Deploy the NestJS backend to a compatible hosting provider.
- Use a managed PostgreSQL database.
- Configure production environment variables.
- Apply migrations during deployment.
- Configure CORS for the deployed frontend domain.
- Test creation, sharing, authentication, and expiration using production URLs.

**Completion criteria:** The application works through public HTTPS URLs without depending on localhost.

## 8. Testing Checklist

- [ ] Create a paste with valid content.
- [ ] Reject empty or oversized content.
- [ ] Generate unique paste IDs.
- [ ] Retrieve an existing paste.
- [ ] Return 404 for nonexistent pastes.
- [ ] Return 404 for expired pastes.
- [ ] Verify raw-text responses.
- [ ] Verify syntax highlighting.
- [ ] Verify public, unlisted, and private access.
- [ ] Verify registration and login.
- [ ] Reject incorrect credentials.
- [ ] Prevent unauthorized editing and deletion.
- [ ] Verify search, filters, and pagination.
- [ ] Verify expiration cleanup.
- [ ] Verify data persistence after restart.
- [ ] Verify deployed frontend-to-backend connectivity.

## 9. Security and Quality Requirements

- Store secrets only in environment variables.
- Never commit `.env` files.
- Validate and normalize all user input.
- Set sensible maximum paste sizes and request limits.
- Use secure password hashing and safe authentication practices.
- Enforce ownership and visibility on every relevant backend endpoint.
- Treat pasted text as untrusted data.
- Use parameterized database operations through TypeORM.
- Avoid exposing stack traces or secrets in production errors.
- Keep controllers, services, entities, DTOs, and frontend components separated.
- Do not introduce Redis, microservices, or other unnecessary infrastructure in the initial version.

## 10. Final Definition of Done

The project is complete when users can create and share pastes, view raw text, use syntax highlighting, set expiration and visibility, register and log in, manage their own pastes, and access the application through a deployed URL.

All data must persist in PostgreSQL. Authorization, validation, expiration, error handling, API tests, database migrations, and deployment configuration must work correctly.

Implement one phase at a time. Validate each phase before proceeding to the next. Do not implement every feature in a single large code-generation task.


## 11. Mandatory Git Workflow

### Base Branch
- `dev` is the base branch for all development.
- `main` is reserved for stable releases.
- Never implement features directly on `dev` or `main`.

### Before Starting Any Phase or Feature
1. Check the current Git branch and working tree.
2. Preserve any existing uncommitted user changes.
3. Fetch the latest remote branches.
4. Switch to `dev` and synchronize it with `origin/dev`.
5. Create a new feature branch from the latest `dev`.
6. Use a descriptive branch name, such as `feature/phase-2-paste-api`.

### During Development
- Implement only the assigned feature or phase.
- Follow the Plan → Implement → Validate workflow.
- Run relevant tests, linting, and build checks.
- Review the Git diff before committing.
- Never commit unrelated changes, secrets, or environment files.
- Never force-push or discard user changes without explicit permission.

### When Development Is Complete
1. Run the required validation checks.
2. Commit the changes with a meaningful message.
3. Push the feature branch to GitHub.
4. Create a pull request targeting `dev`.
5. Include a summary, implementation details, and test results in the PR.
6. Leave the PR open for review unless merging has been explicitly authorized.
7. Do not merge the PR automatically.

### Important Rules
- Always branch from `dev`, never from another feature branch.
- Every phase or independent feature gets its own branch and PR.
- If `dev` does not exist locally or remotely, stop and report the issue rather than silently creating a different base branch.
- If the working tree contains changes, do not overwrite, reset, or commit them without understanding their ownership.
- If GitHub authentication, branch protection, or PR permissions prevent an operation, report the exact issue.
- The setup workflow must not overwrite existing project configuration without reviewing it first.