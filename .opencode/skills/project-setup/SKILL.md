---
name: project-setup
description: Automatically inspect and configure the Pastebin project for a new developer, including dependencies, environment files, PostgreSQL configuration, migrations, GitHub workflow, and validation.
---

# Project Setup Skill

## Objective

Prepare the Pastebin repository for local development after a colleague clones it. Automate safe setup tasks using the existing project configuration and available tools.

## Step 1: Inspect the Repository

- Read `AGENTS.md`, `README.md`, `pastebin.md`, and relevant package manifests.
- Inspect the existing frontend, backend, database configuration, migrations, and Git setup.
- Identify the package manager from existing lockfiles.
- Detect installed tools and required versions.
- Never replace working configuration simply to match a template.

## Step 2: Verify the Git Workflows

- Confirm that `dev` is the development base branch.
- Inspect the current branch, working tree, and remote configuration.
- Fetch remote branches if network access is available.
- Do not switch branches or overwrite changes without checking for uncommitted work.
- Do not create a feature branch merely to perform initial environment setup unless explicitly requested.
- For feature development, create a separate branch from the latest `dev`.
- PRs must target `dev`, never `main`.

## Step 3: Check Prerequisites

Check for:
- Git
- Node.js and npm or the repository's specified package manager
- PostgreSQL and required database access
- OpenCode and the required project instructions

Report missing tools and provide platform-appropriate installation instructions. Do not assume administrator access.

## Step 4: Configure the Environment

- Inspect `.env.example` and the application's configuration requirements.
- Create missing local environment files from safe templates.
- Never print or expose existing secrets.
- Never commit `.env` files.
- Ask the developer to provide missing credentials securely.
- Validate required environment variable names without displaying secret values.

## Step 5: Install Dependencies

- Install frontend and backend dependencies using the existing lockfiles.
- Use reproducible installation commands when supported by the detected package manager.
- Do not upgrade or replace dependencies unnecessarily.
- Report installation errors and attempt safe fixes when possible.

## Step 6: Configure PostgreSQL

- Verify PostgreSQL availability and database connection settings.
- Check whether the required database exists.
- If it does not exist, explain the required database creation operation and request permission before creating it.
- Run existing database migrations using the project's documented scripts.
- Never enable production schema synchronization.
- Never drop, reset, or overwrite a database automatically.

## Step 7: Validate the Application

- Run frontend and backend tests when available.
- Run linting and production builds when available.
- Verify the backend health endpoint if it can be started safely.
- Verify database connectivity and migration status.
- Do not claim successful setup if a required check fails.
- Avoid starting duplicate servers when a development server is already running.

## Step 8: Prepare the Developer Workflow

- Verify that `dev` is the documented base branch.
- Verify the project's feature-branch naming conventions.
- Confirm GitHub CLI authentication status without displaying credentials.
- If GitHub CLI is available, verify repository access when possible.
- Do not create branches, push code, or open PRs as part of routine setup unless explicitly requested.

## Step 9: Final Report

Summarize:
1. Tools and dependencies detected or installed.
2. Environment files created and variables still required.
3. Database connectivity and migration status.
4. Test, lint, and build results.
5. Commands needed to start the application.
6. Any remaining manual steps or blockers.

Execute safe setup operations when possible. Request approval before destructive actions, privileged installations, database creation or modification, or operations that publish changes externally.