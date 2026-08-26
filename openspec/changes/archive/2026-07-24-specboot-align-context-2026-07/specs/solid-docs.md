# spec — SOLID docs envelope

## Requirement: docs/base-standards.md shall declare SOLID as a non-negotiable principle

### Scenario: base-standards.md has a Section 9 SOLID declaration

- **WHEN** a reader loads `docs/base-standards.md`
- **THEN** a "Section 9. Principios de Diseño No Negociables" exists (placed after Section 8) declaring SOLID plus "composition over inheritance" as the rector design principle at the project level, pointing readers to the detailed sub-sections in `docs/backend-standards.md` ("Principios de Diseño — Backend (NestJS)") and `docs/frontend-standards.md` ("Principios de Diseño — Frontend (Angular)" / "Principios de Diseño — Astro").

### Scenario: base-standards.md Section 3 uses correct sibling-relative paths

- **WHEN** a reader loads Section 3 of `docs/base-standards.md`
- **THEN** the links to other docs are sibling-relative (`[Backend Standards](backend-standards.md)`, `[Frontend Standards](frontend-standards.md)`, `[Documentation Standards](documentation-standards.md)`) and NOT repo-root-relative (`docs/backend-standards.md`).

## Requirement: docs/backend-standards.md shall include a SOLID envelope for NestJS

### Scenario: backend-standards.md has a "Principios de Diseño — Backend (NestJS)" section

- **WHEN** a reader loads `docs/backend-standards.md`
- **THEN** a H2 "Principios de Diseño — Backend (NestJS)" exists between "Logging y errores" and "Stack específico del proyecto", with sub-sections for: Estructura de carpetas obligatoria por módulo de negocio (carpetas `domain`, `application`, `infrastructure` per feature and the DIP rule that no file in `domain/` or `application/` may import TypeORM/Prisma/Mongoose/`@nestjs/axios`/`class-validator`/HTTP/SDKs), SRP (split `@Injectable()` into Repository / Domain-App Service / Mapper-Presenter), OCP (Strategy inyectada por token, no `switch` creciente), LSP (contract specs `*.contract.spec.ts`), ISP (interfaces de puertos ≤ 5 métodos), DIP (reinforcement of the carpet structure rule), and "Umbrales objetivos (medibles por linters en CI)" — max 300 lines/file, cyclomatic complexity ≤ 10, max 3 constructor params, inheritance depth ≤ 2.

### Scenario: the existing "Estructura de módulos (NestJS)" sub-section is rewritten to Clean Architecture

- **WHEN** a reader loads the "Estructura de módulos (NestJS)" sub-section under "Stack específico del proyecto" in `docs/backend-standards.md`
- **THEN** it documents `backend/src/modules/<feature>/{domain,application,infrastructure}` instead of the old flat `backend/src/modules/<feature>/{controller,service,dto,entities}`, and notes that the existing `empresas` module will adopt this pattern in a separate change.

### Scenario: existing project-specific sections are preserved

- **WHEN** a reader loads `docs/backend-standards.md`
- **THEN** the existing "Firebase / Firestore", "Autenticación y roles", "Testing", "Lint / build" sub-sections are preserved verbatim — only the SOLID envelope above and the rewritten module structure are inserted.

## Requirement: docs/frontend-standards.md shall include a SOLID envelope for Angular (and reference-only for Astro)

### Scenario: frontend-standards.md has a "Principios de Diseño — Frontend (Angular)" section

- **WHEN** a reader loads `docs/frontend-standards.md`
- **THEN** a "Principios de Diseño — Frontend (Angular)" section exists with sub-sections covering SRP (smart vs dumb — dumb components MUST NOT inject data services), DIP (no `new HttpClient()`), ISP (específic selectors, no whole `Store<AppState>`), and "Umbrales objetivos" (`max-lines 400` per `.ts`, inline template >60-80 lines → extract).

### Scenario: frontend-standards.md has a "Principios de Diseño — Astro" section

- **WHEN** a reader loads `docs/frontend-standards.md`
- **THEN** a "Principios de Diseño — Astro" section exists covering SRP at `.astro` component level and "frontmatter sin lógica de negocio no trivial". This is declared as reference-only — Astro is not used today.

### Scenario: frontend-standards.md stack UI is updated

- **WHEN** a reader loads the stack section of `docs/frontend-standards.md`
- **THEN** it documents TailwindCSS v3, Angular Material (solely for the panel admin, future change), `@angular/google-maps`, `ngx-skeleton-loader`, and `lucide-angular`.

### Scenario: existing project-specific "Convenciones" sub-section is preserved

- **WHEN** a reader loads the "Convenciones" sub-section
- **THEN** it still points to `.github/instructions/frontend-instructions.md` and consumes `https://api.directorio-concon.com/api` as before — not modified by this change.
