# api-contract Specification (delta — auth-usuarios-v2)

## ADDED Requirements

### Requirement: Public self-registration endpoint
The API SHALL expose `POST /api/v1/auth/registro` as a public endpoint (`security: []` in `docs/api-spec.yml`), documented with:

- **Request body** `RegisterDto`: `{ email: string (format: email), password: string (minLength: 8), nombre: string (minLength: 2, maxLength: 100), rol: string (enum: [member, owner]) }`.
- **Responses**: `201` → `{ uid, email, rol, nombre }`; `400` → validation error (whitelist + enum violations, incl. `rol: 'admin'`); `409` → email already registered; `500` → internal failure (with server-side compensating rollback of the Auth user).

#### Scenario: Contract documents the public endpoint
- **WHEN** a consumer reads `docs/api-spec.yml`
- **THEN** `POST /auth/registro` is listed with `security: []` (public) and the `RegisterDto` schema with the closed enum `[member, owner]`
- **AND** no field named `placeId` appears in the `Usuario` schema

#### Scenario: Admin provisioning endpoint is retired from the contract
- **WHEN** any client calls `POST /api/v1/usuarios` (even with a valid admin Bearer token)
- **THEN** the response is `404` — the route no longer exists (admin provisioning is replaced by public self-registration via `POST /auth/registro`; the first admin is bootstrapped by the `seed-admin` script directly against Firebase)
- **AND** the `POST /usuarios` path and the `CreateUsuario` schema no longer appear in `docs/api-spec.yml`

### Requirement: Usuarios role-change contract is restricted to admin/member targets
The `PUT /api/v1/usuarios/{uid}/rol` endpoint SHALL remain admin-only (`security: [{ bearerAuth: [] }]`) and its request body schema `UpdateRol` SHALL declare `rol` with `enum: [admin, member]`. The value `owner` SHALL NOT be an accepted target; requests carrying it fail validation with `400`.

#### Scenario: OpenAPI enum matches backend validation
- **WHEN** a client generates types from `docs/api-spec.yml`
- **THEN** `UpdateRol.rol` is typed as `'admin' | 'member'`
- **AND** a runtime request `{ rol: 'owner' }` receives `400` from the backend whitelist validation
