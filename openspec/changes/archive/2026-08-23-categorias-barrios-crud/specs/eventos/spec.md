## ADDED Requirements

### Requirement: Cross-catalog validation in evento create and update

The system SHALL validate at create and update time that `categoriaId` (always the constant `'eventos'`), `subcategoriaId` (required), and `barrioId` referenced by an `Evento` document resolve to existing and `activo: true` documents in the `categorias` and `barrios` collections respectively. `subcategoriaId` MUST be one of the slugs present in the `eventos` categoria's `subcategorias` array with `activo: true`. Validation MUST only fire when the corresponding field is being set or modified.

#### Scenario: Create evento rejects nonexistent subcategoria

- **WHEN** the categoria `eventos` does not have a subcategoria with slug `inexistente`
- **AND** an admin or owner sends `POST /api/v1/eventos` with `subcategoriaId: "inexistente"`
- **THEN** the response is `400` with error "Subcategoría inválida o inactiva"

#### Scenario: Create evento rejects inactive subcategoria

- **WHEN** the categoria `eventos` contains a subcategoria `festivales-culturales` with `activo: false`
- **AND** an admin or owner sends `POST /api/v1/eventos` with `subcategoriaId: "festivales-culturales"`
- **THEN** the response is `400` with error "Subcategoría inválida o inactiva"

#### Scenario: Create evento rejects inactive barrio

- **WHEN** the barrios collection contains a barrio with slug `montemar` and `activo: false`
- **AND** an admin or owner sends `POST /api/v1/eventos` with `barrioId: "montemar"`
- **THEN** the response is `400` with error "Barrio inválido o inactivo"

#### Scenario: Update evento changing subcategoriaId to inactive rejects

- **WHEN** an evento exists with `subcategoriaId: "festivales-culturales"` (currently `activo: true`)
- **AND** an admin or owner sends `PUT /api/v1/eventos/{id}` with `{ subcategoriaId: "ferias-gastronomicas" }`
- **AND** subcategoria `ferias-gastronomicas` has `activo: false`
- **THEN** the response is `400` with error "Subcategoría inválida o inactiva"

#### Scenario: Update evento touching organizador only does not re-validate catalog

- **WHEN** an evento exists with `subcategoriaId: "festivales-culturales"` (currently `activo: false`)
- **AND** an admin or owner sends `PUT /api/v1/eventos/{id}` with only `{ organizador: "Nuevo Org" }`
- **THEN** the evento is updated successfully
- **AND** no validation against the categorias collection is performed
