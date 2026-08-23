## ADDED Requirements

### Requirement: Barrio entity schema

The system SHALL persist a `Barrio` document in the Firestore collection `barrios` with the following fields:

- `id: string` — Firestore document ID (slug, ej. `higuerillas`, `zona-rural`)
- `nombre: string` — 2..80 characters, display name
- `slug: string` — URL-friendly unique identifier, MUST be unique across the collection
- `tipo: 'urbano' | 'rural'` — required, default `'urbano'`
- `descripcion?: string` — optional free-text description
- `territorio?: string` — optional metadata about sectors the barrio encompasses
- `coordenadas?: { lat: number; lng: number }` — optional center point for the barrio
- `codigo?: string` — optional UV code
- `activo: boolean` — default `true` on create; admin can toggle to `false` to soft-delete
- `createdAt: Date` — document creation timestamp
- `updatedAt: Date` — last modification timestamp

#### Scenario: Create barrio with valid fields

- **WHEN** an admin sends `POST /api/v1/barrios` with `nombre: "Higuerillas"`, `slug: "higuerillas"`, `tipo: "urbano"`
- **THEN** the system creates a document with `activo: true`, `createdAt`/`updatedAt` set, returns `201` with the document
- **AND** the response includes all fields including `id`, `nombre`, `slug`, `tipo`, `activo`, `createdAt`, `updatedAt`

#### Scenario: Create barrio rejects duplicate slug

- **WHEN** a barrio with slug `higuerillas` already exists
- **AND** an admin sends `POST /api/v1/barrios` with `slug: "higuerillas"`
- **THEN** the response is `409` with error "Slug duplicado"

#### Scenario: Create barrio rejects invalid tipo

- **WHEN** an admin sends `POST /api/v1/barrios` with `tipo: "industrial"` (not in `{urbano, rural}`)
- **THEN** the response is `400` with validation error on `tipo`

#### Scenario: Create barrio rejects non-admin caller

- **WHEN** a caller with `rol: 'owner'` or `rol: 'member'` sends `POST /api/v1/barrios`
- **THEN** the response is `403`

#### Scenario: Public GET barrios filters activo

- **WHEN** an anonymous visitor sends `GET /api/v1/barrios?activo=true`
- **THEN** the response is `200` with an array where every barrio has `activo: true`

#### Scenario: Public GET barrios includes inactive when no filter

- **WHEN** an admin sends `GET /api/v1/barrios` (no `activo` filter)
- **THEN** the response is `200` with all barrios regardless of `activo`
- **AND** each item includes the `activo` flag

---

### Requirement: Barrio admin update and lifecycle

The system SHALL allow admin to update `nombre`, `descripcion`, `territorio`, `coordenadas`, `codigo`, and toggle `activo` on existing barrios.

#### Scenario: PATCH barrio updates nombre

- **WHEN** an admin sends `PATCH /api/v1/barrios/higuerillas` with `{ nombre: "Las Higuerillas" }`
- **THEN** the barrio `higuerillas` is updated with the new `nombre`, `updatedAt` refreshed, response is `200`

#### Scenario: Deactivate barrio

- **WHEN** an admin sends `PATCH /api/v1/barrios/higuerillas/desactivar`
- **THEN** the barrio is updated to `activo: false` and the response is `200`
- **AND** no cascade is applied to existing places/eventos referencing this barrio

#### Scenario: Activate barrio

- **WHEN** an admin sends `PATCH /api/v1/barrios/higuerillas/activar`
- **THEN** the barrio is updated to `activo: true` and the response is `200`

#### Scenario: PATCH nonexistent barrio returns 404

- **WHEN** an admin sends `PATCH /api/v1/barrios/inexistente`
- **THEN** the response is `404`
