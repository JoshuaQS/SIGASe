# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

SIGASe is an academic management system for UTEZ. The repository is structured as:

| Directory | Purpose | Stack |
|-----------|---------|-------|
| `client/` | Frontend SPA | Node.js / pnpm (framework TBD — likely React or Vue) |
| `server/` | Backend REST API | Java 21 / Spring Boot / Maven (`mx.edu.utez.server`) |
| `tests/` | E2E browser tests | Playwright |

The repository is currently a **scaffold** — only `.gitkeep` placeholder files exist. No `package.json`, `pom.xml`, or application config files have been committed yet.

### Available toolchain

| Tool | Version | Notes |
|------|---------|-------|
| Java (OpenJDK) | 21 | Pre-installed |
| Maven | 3.8.7 | Installed via apt |
| Node.js | 22 | Pre-installed via nvm |
| pnpm | 10.x | Pre-installed |
| Playwright | 1.59.x | Available via npx |

### Development commands (once source code is committed)

- **Backend**: `cd server && mvn spring-boot:run` (expects a `pom.xml`)
- **Frontend**: `cd client && pnpm install && pnpm dev` (expects a `package.json`)
- **E2E tests**: `cd tests/playwright && npx playwright test` (expects a `playwright.config.ts`)
- **Backend tests**: `cd server && mvn test`
- **Lint (frontend)**: `cd client && pnpm lint` (once configured)

### Gotchas

- Maven is installed via `apt` (`/usr/share/maven`). If the project needs a specific Maven version, consider using the Maven wrapper (`mvnw`) once it's committed.
- The `.gitignore` references `server/target/`, `client/dist/`, and `**/node_modules/` — these are the expected build output directories.
- A relational database (MySQL or PostgreSQL) will likely be required once the backend code is committed. Check `server/src/main/resources/application.properties` or `application.yml` for connection details.
