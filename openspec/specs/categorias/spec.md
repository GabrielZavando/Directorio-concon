# categorias Specification

## Purpose
TBD - created by archiving change categorias-barrios-crud. Update Purpose after archive.
## Requirements
### Requirement: Categoria entity schema

The system SHALL persist a `Categoria` document in the Firestore collection `categorias` with the following fields:

- `id: string` — Firestore document ID (slug, ej. `gastronomia`, `comercio`)
- `nombre: string` — 2..80 characters, display name (e.g. "Gastronomía")
- `slug: string` — URL-friendly unique identifier, MUST be unique across the collection
- `descripcion?: string` — optional free-text description
- `icono: string` — Lucide icon name in kebab-case; MUST be one of `utensils | store | tent | briefcase | car | heart-pulse | graduation-cap | building-2 | party-popper`
- `color?: string` — optional hex color
- `orden: number` — visual ordering (1..99), MUST be unique across the collection
- `activo: boolean` — default `true` on create; admin can toggle to `false` to soft-delete
- `subcategorias: Subcategoria[]` — array (possibly empty) of `{ slug: string, nombre: string, activo: boolean }`; default `[]` on create
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp

#### Scenario: Create categoria with valid icon and unique slug

- **WHEN** an admin sends `POST /api/v1/categorias` with `nombre: "Gastronomía"`, `slug: "gastronomia"`, `icono: "utensils"`, `orden: 1`
- **THEN** the system creates a document with `activo: true`, `subcategorias: []`, `createdAt`/`updatedAt` set, returns `201` with the document
- **AND** the response includes `id`, `nombre`, `slug`, `icono`, `orden`, `activo`, `subcategorias`, `createdAt`, `updatedAt`

#### Scenario: Create categoria rejects duplicate slug

- **WHEN** a categoria with slug `gastronomia` already exists
- **AND** an admin sends `POST /api/v1/categorias` with `slug: "gastronomia"`
- **THEN** the response is `409` with error "Slug duplicado"
- **AND** no document is created

#### Scenario: Create categoria rejects duplicate orden

- **WHEN** a categoria with `orden: 1` already exists
- **AND** an admin sends `POST /api/v1/categorias` with `orden: 1`
- **THEN** the response is `409` with error "Orden duplicado"

#### Scenario: Create categoria rejects invalid icono

- **WHEN** an admin sends `POST /api/v1/categorias` with `icono: "fork-knife"` (not in the Lucide allowlist)
- **THEN** the response is `400` with validation error on `icono`

#### Scenario: Create categoria rejects non-admin caller

- **WHEN** a caller with `rol: 'owner'` or `rol: 'member'` sends `POST /api/v1/categorias`
- **THEN** the response is `403`

#### Scenario: Public GET categorias filters activo and inactive subcategorias

- **WHEN** an anonymous visitor sends `GET /api/v1/categorias?activa=true`
- **THEN** the response is `200` with an array where every categoria has `activo: true`
- **AND** within each categoria the `subcategorias` array is filtered to only show elements with `activo: true`
- **AND** each returned subcategoria element has `{ slug, nombre }` (without `activo`)

#### Scenario: Public GET categorias includes inactive when explicit

- **WHEN** an admin sends `GET /api/v1/categorias` (no `activa` filter)
- **THEN** the response is `200` with all categorias regardless of `activo`
- **AND** each `subcategorias` array includes all subcategorias regardless of `activo`
- **AND** each subcategoria includes the `activo` flag

---

### Requirement: Subcategoria lifecycle

The system SHALL support nested lifecycle operations on the `subcategorias` array inside a `Categoria` document. Mutations of the array MUST be atomic via Firestore transactions to avoid lost updates when two admins edit simultaneously.

#### Scenario: Add subcategoria to existing categoria

- **WHEN** an admin sends `POST /api/v1/categorias/gastronomia/subcategorias` with `{ slug: "pescaderias", nombre: "Pescaderías" }`
- **THEN** the categoria `gastronomia` is updated atomically (transaction)
- **AND** the new subcategoria `{ slug: "pescaderias", nombre: "Pescaderías", activo: true }` is appended to the `subcategorias` array
- **AND** the response is `201` with the new subcategoria

#### Scenario: Add duplicate subcategoria slug rejects

- **WHEN** a categoria `gastronomia` already contains a subcategoria with `slug: "restaurantes"`
- **AND** an admin sends `POST /api/v1/categorias/gastronomia/subcategorias` with `{ slug: "restaurantes" }`
- **THEN** the response is `409` with error "Subcategoría duplicada en esta categoría"
- **AND** no array element is appended

#### Scenario: Add subcategoria to nonexistent categoria rejects

- **WHEN** an admin sends `POST /api/v1/categorias/inexistente/subcategorias`
- **THEN** the response is `404`

#### Scenario: Deactivate subcategoria

- **WHEN** an admin sends `PATCH /api/v1/categorias/gastronomia/subcategorias/restaurantes/desactivar`
- **THEN** the subcategoria with `slug: "restaurantes"` inside `gastronomia` is updated to `activo: false`
- **AND** other subcategorias in the same array remain unchanged
- **AND** the response is `200` with the updated subcategoria

#### Scenario: Deactivate subcategoria leaves existing places untouched

- **WHEN** a place exists with `categoriaId: "gastronomia"` and `subcategoriaId: "restaurantes"`
- **AND** an admin deactivates subcategoria `restaurantes`
- **THEN** the existing place document is unchanged (no cascade effect)
- **AND** new places trying to assign `subcategoriaId: "restaurantes"` will be rejected
- **AND** the existing place can still be edited for fields other than `subcategoriaId` (validation only fires when the field is being set/changed)

---

### Requirement: Categoria admin update and lifecycle

The system SHALL allow admin to update `nombre`, `icono`, `orden`, and toggle `activo` on existing categorias. Mutations MUST preserve the `subcategorias` array as-is unless explicitly modified via subcategoria endpoints.

#### Scenario: PATCH categoria updates nombre

- **WHEN** an admin sends `PATCH /api/v1/categorias/gastronomia` with `{ nombre: "Gastronomía y Cocina" }`
- **THEN** the categoria `gastronomia` is updated with the new `nombre`
- **AND** `subcategorias` is preserved, `updatedAt` is refreshed, response is `200`

#### Scenario: PATCH categoria rejects duplicate orden

- **WHEN** categoria with `orden: 2` already exists
- **AND** an admin sends `PATCH /api/v1/categorias/gastronomia` with `{ orden: 2 }`
- **THEN** the response is `409` with error "Orden duplicado"

#### Scenario: Deactivate categoria

- **WHEN** an admin sends `PATCH /api/v1/categorias/gastronomia/desactivar`
- **THEN** the categoria `gastronomia` is updated to `activo: false`
- **AND** the response is `200` with the updated categoria
- **AND** no cascade is applied to existing places/eventos referencing this categoria

#### Scenario: Activate categoria

- **WHEN** an admin sends `PATCH /api/v1/categorias/gastronomia/activar`
- **THEN** the categoria is updated to `activo: true` and the response is `200`

#### Scenario: PATCH nonexistent categoria returns 404

- **WHEN** an admin sends `PATCH /api/v1/categorias/inexistente`
- **THEN** the response is `404`

