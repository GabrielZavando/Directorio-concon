# spec — Project context (Section 8 of base-standards.md)

## Requirement: Section 8 shall include the project's complete stack, users, business flows and module roadmap

### Scenario: Section 8 documents the complete stack with correct versions

- **WHEN** a reader loads `docs/base-standards.md`
- **THEN** Section 8 references Node.js 22, NestJS 11.x, TypeScript 5, Firebase (Firestore + Auth + Storage via Admin SDK + `firebase-admin.json` credentials file), Angular 20 standalone + `@angular/fire` 20 + Firebase Web SDK 11, TailwindCSS v3 + Angular Material (solely for the panel admin, future) + `@angular/google-maps` + `ngx-skeleton-loader` + `lucide-angular`, the design system "Dunas y Océano" (canonical at `docs/DESIGN.md`), Redis cache, Jest+Supertest (90% target) and Jasmine+Karma (80% target), OpenAPI via Swagger at `/api/docs` (dev only), ESLint + dependency-cruiser + madge, and SDD via Specboot + OpenSpec.

### Scenario: Section 8 lists the three user personas

- **WHEN** a reader loads Section 8
- **THEN** the documented personas are: Visitante anónimo (no login), Empresario (rol `empresa`, registers and manages his own business), and Admin del directorio (rol `admin`, approves/rejects `solicitudes`, manages `categorias` and `barrios`). A "Reviewer" persona is NOT documented (post-MVP).

### Scenario: Section 8 documents the three core business flows

- **WHEN** a reader loads Section 8
- **THEN** the "Flujos de negocio" section describes (1) Registro de empresa: empresario signs up in Firebase Auth → `POST /api/v1/empresas` (generates a `solicitud` pendiente + empresa pendiente) → admin approves the `solicitud` → empresa becomes `aprobada`; (2) Descubrimiento: visitante anónimo browses home → filters by `categoriaId`/`barrioId`/`q` → opens ficha by `slug` → sees the interactive map; (3) Gestión de catálogo: admin maintains `categorias` and `barrios` via admin CRUD, initial seed loaded via `npm run seed`.

### Scenario: Section 8 documents MVP vs post-MVP module roadmap

- **WHEN** a reader loads Section 8
- **THEN** an explicit "Roadmap de módulos" lists MVP modules as: `auth` → `usuarios` → `categorias` → `barrios` → `solicitudes` → `frontend` (4 pantallas: home/listado, ficha empresa, vista mapa, auth signup/login); and post-MVP modules as `planes`, `suscripciones`, `pagos`, `recursos-digitales`, `chat-empresarial`, `reviews`, `ai`, `analytics` (referenced in code as commented imports in `app.module.ts`). The panel admin + Angular Material is explicitly out of MVP scope (future change).

### Scenario: Section 8 references the design system canónically

- **WHEN** a reader loads Section 8
- **THEN** the design system "Dunas y Océano" is named explicitly, with `docs/DESIGN.md` cited as the canonical source of design tokens and `docs/{home,login,mapa,perfil}/` cited as per-screen reference exports (HTML + compressed JPG screenshots).

### Scenario: Section 8 preserves the existing 8.1 cross-references

- **WHEN** a reader loads Section 8
- **THEN** the existing `8.1 Fuentes de contexto del proyecto (ya documentadas)` block is unchanged, still pointing at `.github/instructions/{backend,database,frontend,ai,deployment}-instructions.md` and confirming `docs/data-model.md` + `docs/api-spec.yml` as canonical.
