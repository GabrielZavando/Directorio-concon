## ADDED Requirements

### Requirement: Cross-catalog validation in place create and update

The system SHALL validate at create and update time that `categoriaId`, `subcategoriaId` (when present), and `barrioId` referenced by a `Place` document resolve to existing and `activo: true` documents in the `categorias` and `barrios` collections respectively. Validation MUST only fire when the corresponding field is being set or modified; updates that do not touch these fields MUST NOT re-validate.

#### Scenario: Create place rejects inactive categoria

- **WHEN** the categorias collection contains a categoria with slug `gastronomia` and `activo: false`
- **AND** an admin or owner sends `POST /api/v1/places` with `categoriaId: "gastronomia"`
- **THEN** the response is `400` with error "Categoría inválida o inactiva"
- **AND** no Place document is created

#### Scenario: Create place rejects nonexistent categoria

- **WHEN** the categorias collection does not contain a categoria with id `inexistente`
- **AND** an admin or owner sends `POST /api/v1/places` with `categoriaId: "inexistente"`
- **THEN** the response is `400` with error "Categoría inválida o inactiva"

#### Scenario: Create place rejects inactive subcategoria

- **WHEN** the categoria `gastronomia` has a subcategoria `restaurantes` with `activo: false`
- **AND** an admin or owner sends `POST /api/v1/places` with `categoriaId: "gastronomia"` and `subcategoriaId: "restaurantes"`
- **THEN** the response is `400` with error "Subcategoría inválida o inactiva"

#### Scenario: Create place rejects inactive barrio

- **WHEN** the barrios collection contains a barrio with slug `higuerillas` and `activo: false`
- **AND** an admin or owner sends `POST /api/v1/places` with `barrioId: "higuerillas"`
- **THEN** the response is `400` with error "Barrio inválido o inactivo"

#### Scenario: Update place touching nombre does not re-validate catalog references

- **WHEN** a place exists with `categoriaId: "gastronomia"` (currently `activo: false`)
- **AND** an admin or owner sends `PUT /api/v1/places/{id}` with only `{ nombre: "Nuevo Nombre" }`
- **THEN** the place is updated successfully
- **AND** no validation against the categorias collection is performed (the field was not changed)

#### Scenario: Update place changing categoriaId to inactive rejects

- **WHEN** a place exists with `categoriaId: "gastronomia"` (activo)
- **AND** an admin or owner sends `PUT /api/v1/places/{id}` with `{ categoriaId: "comercio" }`
- **AND** categoria `comercio` has `activo: false`
- **THEN** the response is `400` with error "Categoría inválida o inactiva"

#### Scenario: Update place keeping same categoriaId does not re-validate

- **WHEN** a place exists with `categoriaId: "gastronomia"` (currently `activo: false`)
- **AND** an admin sends `PUT /api/v1/places/{id}` with `{ categoriaId: "gastronomia" }` (same value, explicit)
- **THEN** the place is updated successfully
- **AND** no validation against the categorias collection is performed (the value did not change)
