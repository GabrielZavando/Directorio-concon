# spec — 8-phase code auditing skill alignment

## Requirement: ai-specs/skills/code-auditing/SKILL.md shall describe a 8-phase audit

### Scenario: SKILL.md has 8 phases including the new SOLID/POO Lente Architect phase

- **WHEN** a reader loads `ai-specs/skills/code-auditing/SKILL.md`
- **THEN** it lists 8 phases — Fase 1 Seguridad, Fase 2 Tipos y contratos, Fase 3 Performance, Fase 4 Código muerto y duplicación, Fase 5 Best practices de librerías, Fase 6 Tests, Fase 7 OpenSpec Alignment, Fase 8 SOLID/POO — Lente Architect.

### Scenario: Fase 8 contains per-stack checklists

- **WHEN** a reader loads Fase 8 in `ai-specs/skills/code-auditing/SKILL.md`
- **THEN** it contains concrete checklists for NestJS/Backend (DIP: imports in `domain/` or `application/` from TypeORM/Prisma/Mongoose/`@nestjs/axios`; SRP: `@Injectable()` mixing data + business + formatting; DIP: `new` inside constructors; OCP: growing `if/else`/`switch`; ISP: interfaces >5 methods; SRP: >300 lines or complexity >10), Angular (dumb component injecting a data service; component mixing presentation + business logic), and Astro (frontmatter with non-trivial business logic).

### Scenario: Fase 8 mandates a structured output format per finding

- **WHEN** a reader loads Fase 8 in `ai-specs/skills/code-auditing/SKILL.md`
- **THEN** the output format requires every Fase 8 finding to include: `[Principio violado] — [Archivo:línea] / Qué se observa / Por qué viola / Refactor sugerido`.

### Scenario: SKILL.md description text says "8 fases"

- **WHEN** a reader loads the "## Descripción" section in `ai-specs/skills/code-auditing/SKILL.md`
- **THEN** the wording is "auditoría sistemática de calidad de código en 8 fases" (not "7 fases").

## Requirement: The 8-phase wording shall be applied consistently across opencode.json, AGENTS.md and ai-specs/README.md

### Scenario: opencode.json adversarial-review template uses 8-phase

- **WHEN** a reader loads `opencode.json` `command.adversarial-review`
- **THEN** the `template` field says "Run the 8-phase audit..." and the `description` field says "Systematic 8-phase code quality audit".

### Scenario: opencode.json does not declare a model

- **WHEN** a reader loads `opencode.json`
- **THEN** no `"model"` field is present at the top level or inside any agent block — the project stays model-agnostic per upstream README.

### Scenario: AGENTS.md skill row for code-auditing includes the SOLID lens mention

- **WHEN** a reader loads `AGENTS.md` skill trigger table
- **THEN** the row for `code-auditing` ends with "(incluye lente Architect/SOLID-POO)".

### Scenario: AGENTS.md command table for /adversarial-review includes 8-phase wording and the SOLID lens mention

- **WHEN** a reader loads `AGENTS.md` command table
- **THEN** the `/adversarial-review` row description is "Systematic 8-phase code quality audit (incluye lente Architect/SOLID por stack)".

### Scenario: ai-specs/README.md describes the code-auditing skill as 8-phase

- **WHEN** a reader loads `ai-specs/README.md`
- **THEN** the "Code Auditing" skill description says "Systematic 8-phase code quality audit" and the "Phases" line lists all 8 phases ending with "SOLID/POO (lente Architect)".

### Scenario: ai-specs/README.md Customization table lists the new canonical docs

- **WHEN** a reader loads the Customization table in `ai-specs/README.md`
- **THEN** the table contains three new rows: `docs/ci-standards.md` ("SOLID/POO mechanical thresholds + instantiation of templates/ci/"), `templates/ci/` ("ESLint + dependency-cruiser configs per project"), and `docs/DESIGN.md` ("Sistema de diseño Dunas y Océano (originado Stitch)").
