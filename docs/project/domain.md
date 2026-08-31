# Dominio

> Contexto de negocio del proyecto (propiedad del dev). Migrado desde
> `docs/base-standards.md` §8.2–§8.5 durante la migración a `@gabrielzavando/specboot`.

## Usuarios / personas

| Usuario | Login | Rol | Función |
|---|---|---|---|
| **Visitante anónimo** | sin login | — | Descubre places por categoría/barrio, abre ficha, ve mapa. No requiere autenticación. Rol implícito del sistema (no se persiste en `usuarios`). |
| **Member registrado** | Firebase Auth | `member` | Usuario autenticado con perfil básico. Acceso de lectura pública completo. Capacidad (futura, deferred al change `auth + usuarios`) de guardar `places` favoritos. NO puede publicar places ni eventos. Reemplaza al rol legacy `usuario`. |
| **Owner de place** | Firebase Auth | `owner` | Se registra, crea su place (genera `solicitud` pendiente), gestiona su ficha (horarios/servicios/redes/logo). Es el usuario operacional central. Crea eventos con `eventos.usuarioId === token.uid`. Reemplaza al rol legacy `empresa`. |
| **Admin del directorio** | Firebase Auth | `admin` | Aprueba/rechaza `solicitudes`, gestiona `categorias` y `barrios`, destaca/verifica places, modera el directorio. |

> **Nota:** 3 roles autenticados (`admin`, `owner`, `member`) + 1 visitante anónimo (sin login, sin persistencia en `usuarios`) coexisten. El enum renombrado cierra desde el change `roles-rename`; la deuda de autenticación (stubs `"anonymous"` y header `x-usuario-id`) se documentó en `docs/data-model/data-model.md §usuarios` y se cierra cuando el change MVP `auth + usuarios` aterrice.

> Sin `reviewer` — sistema de reviews/calificaciones queda fuera del MVP (post-MVP).

## Flujos de negocio

### Flujo 1 — Registro de place

1. Owner se registra en Firebase Auth → rol `owner` (asignado vía `usuarios` collection).
2. `POST /api/v1/places` crea el place con `status: pendiente` y genera automáticamente un documento `solicitudes` con `tipo: 'registro'`, `status: 'pendiente'`, `placeId` apuntando al nuevo place.
3. El `admin` revisa la `solicitud`:
   - Aprueba → `solicitud.status: aprobado` + `place.status: aprobado` → visible públicamente.
   - Rechaza → `solicitud.status: rechazado` + `place.status: rechazado` (queda registrado pero oculto).

### Flujo 2 — Descubrimiento (visitante anónimo)

1. Visitante anónimo entra al home (`docs/home/code.html` referencia visual).
2. Filtra places por `categoriaId`, `barrioId` o query de texto: `GET /api/v1/places?q=&categoriaId=&barrioId=&page=&limit=`.
3. Abre una ficha por `slug`: `GET /api/v1/places/slug/:slug` (`docs/perfil/code.html` referencia visual).
4. Ve el mapa interactivo: `GET /api/v1/places/map-data` (`docs/mapa/code.html` referencia visual).

### Flujo 3 — Gestión de catálogo (admin)

1. `admin` mantiene `categorias`, `barrios` y `places` mediante CRUD admin (Angular Material en panel admin futuro).
2. Al iniciar el proyecto, `npm run seed` (en `backend/`) pobla Firestore con un inventario fijo de categorías de Concón (Restaurantes, Hospedaje, Servicios, Retail, Salud…) y barrios (Centro, Bosques, Montemar, La Boca, Reñaca Alto…).

## Roadmap de módulos

### MVP — Implementado (change `auth-usuarios`)

1. **`auth`** — Firebase Auth + guards JWT + roles (implementado por el change `auth-usuarios`): módulo `auth` NestJS con `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`, `AuthContext`; sourcing del `rol` desde Firebase custom claim + fallback a Firestore `usuarios`. Cierra las 3 debilidades de autenticación documentadas en `roles-rename` (ver `docs/data-model/data-model.md §usuarios` "Authentication debt — [CLOSED]").
2. **`usuarios`** — CRUD de usuarios + vinculación con Auth (implementado por el change `auth-usuarios`): entity `Usuario`, `UsuariosRepository`, `UsuariosService`, `UsuariosController` con `GET /usuarios/me`, `PUT /usuarios/me`, `POST /usuarios` admin, `PUT /usuarios/:uid/rol` admin. El provisioning es admin-only en este change; self-registration via frontend queda para un change futuro `usuarios-self-signup`.

### MVP — Implementado (change `categorias-barrios-crud`)

3. **`categorias`** — CRUD admin + seed fijo (implementado por el change `categorias-barrios-crud`): módulo NestJS Clean Architecture por feature (`domain/`, `application/`, `infrastructure/`), `CatalogValidator` compartido para validación cross-catálogo en `places`/`eventos` (flag `CATALOG_VALIDATION_ENABLED`), y `npm run seed` funcional que puebla Firestore desde `categorias.json`/`barrios.json` del frontend.
4. **`barrios`** — CRUD admin + seed fijo (implementado por el change `categorias-barrios-crud`): repositorios `BarrioReadRepository`/`BarrioWriteRepository` (ISP ≤5 métodos), toggles activar/desactivar admin, lectura pública `GET /barrios?activo=true`.

### MVP — Pendiente (en este orden de implementación)

1. **`solicitudes`** — Listado + aprobar/rechazar por admin (cierra el Flujo 1). El `SolicitudesService` ya existe (de `eventos-crud`); el `SolicitudesController` HTTP (endpoints `POST /solicitudes/:id/approve|reject` con `@Roles('admin')`) se introdujo en el change `auth-usuarios` para cerrar la deuda de `revisadoPor`. Pendiente: endpoints de listado/filtrado de solicitudes.
2. **`frontend`** — 4 pantallas del design system "Dunas y Océano":
   - Home / landing → `docs/home/code.html`
   - Auth signup/login → `docs/login/code.html`
   - Vista mapa → `docs/mapa/code.html`
   - Ficha de place → `docs/perfil/code.html`

### Post-MVP (módulos comentados en `app.module.ts`, no en scope)

- `planes`, `suscripciones`, `pagos` — Monetización freemium con pasarela de pago (no implementada en MVP).
- `recursos-digitales`, `chat-empresarial` — Funcionalidades premium.
- `reviews` — Sistema de calificaciones de visitantes (no `reviewer` como persona separada; cualquier usuario puede calificar).
- `ai` — Generación de descripciones, búsqueda semántica, chatbot recomendador (sin IA en MVP).
- `analytics` — Métricas y analítica.
- `eventos` — Directorio de eventos comunales (colección `eventos`, módulo NestJS Clean Architecture, flujo de aprobación vía `solicitudes` extendido, frontend completo con formulario, listado, ficha y mapa). En implementación activa como change `eventos-crud`.

### Cambios futuros fuera de MVP

- **Panel admin** + Angular Material UI (cambio OpenSpec separado).
- **`places`** → refactor a Clean Architecture (cambio futuro `places-clean-arch-refactor`).

## Fuentes de contexto del proyecto

> **Fuente canónica**: `docs/data-model/data-model.md` y `docs/api/api-spec.yml`
> (sincronizados con OpenSpec y Specboot).
> Design system canónico: `docs/DESIGN.md` "Dunas y Océano" + per-screen exports en
> `docs/{home,login,mapa,perfil}/`.

> Nota histórica: las guías pre-Specboot en `.github/instructions/` fueron retiradas
> durante la migración al paquete `@gabrielzavando/specboot`; su contenido vigente
> quedó cubierto por los documentos canónicos anteriores.
