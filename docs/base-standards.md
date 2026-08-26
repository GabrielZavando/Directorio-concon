---
description: Reglas globales de desarrollo para agentes IA (OpenCode). Aplica siempre.
alwaysApply: true
---

# Base Standards — Agencia Zavando

## 1. Principios core

- **Pasos pequeños, uno a la vez**: Nunca avanzar más de un paso sin confirmar. Baby steps siempre.
- **TDD (Test-Driven Development)**: Escribir test fallido primero para cualquier funcionalidad nueva.
- **Tipado completo**: Todo el código debe estar completamente tipado (TypeScript, PHPDoc, etc.).
- **Nombres descriptivos**: Variables y funciones con nombres claros y específicos al dominio.
- **Cambios incrementales**: Preferir modificaciones pequeñas y revisables sobre cambios grandes.
- **Cuestionar supuestos**: Siempre preguntar ante ambigüedades antes de asumir.
- **Detectar patrones repetidos**: Identificar y señalar código duplicado o patrones que deben abstraerse.

## 2. Idioma del código

- **Todo en inglés**: Variables, funciones, clases, comentarios, mensajes de error, logs.
- **Documentación en español**: READMEs para el cliente, comentarios de negocio, tickets pueden ir en español.
- **Commits en inglés**: Siempre. Conventional commits format.
- **Nombres de base de datos en inglés**: Tablas, columnas, índices.

## 3. Estándares específicos por área

Para estándares detallados, leer los archivos correspondientes:

- [Backend Standards](backend-standards.md) — API, base de datos, testing, seguridad
- [Frontend Standards](frontend-standards.md) — Componentes, UI/UX, estado
- [Documentation Standards](documentation-standards.md) — Estructura docs, OpenAPI, mantenimiento

## 4. Skills del proyecto

- Los skills viven en `ai-specs/skills/`.
- Cuando una solicitud coincida con la descripción de un skill, cargar y seguir el `SKILL.md` correspondiente automáticamente antes de continuar.
- Cargar también los archivos referenciados en la carpeta del skill cuando el skill los requiera.
- La lista de skills disponibles y sus triggers está en `AGENTS.md` (se carga junto con este archivo). Para descripciones extendidas, ver [`ai-specs/README.md`](../ai-specs/README.md).

## 5. Modelo de planning

Los flujos de planning se ejecutan mediante los custom commands definidos en `opencode.json`:

- `/enrich-us` — Enriquecer user story vaga antes de planificar
- `/plan-change` — Generar OpenSpec specs y tasks a partir de un ticket
- `/apply` — Implementar tareas desde los artefactos OpenSpec (TDD)
- `/verify` — Validar implementación contra escenarios OpenSpec
- `/adversarial-review` — Auditoría sistemática de calidad
- `/archive` — Archivar artefactos OpenSpec al completar
- `/commit` — Crear commits convencionales y PR

El modelo para cada agente está definido en `opencode.json`. No hardcodear modelos aquí.

## 6. Orquestación con OpenCode (fuente canónica)

- **OpenCode es la única herramienta objetivo** de este template. No se generan
  symlinks ni configuraciones para Claude Code (`.claude/`) ni Cursor (`.cursor/`).
- **Fuente canónica**: Los artefactos reutilizables (agentes y skills) viven en
  `ai-specs/`. OpenCode los consume directamente mediante referencias
  `{file:...}` declaradas en `opencode.json`.
- **Un cambio es incompleto** si deja referencias `{file:...}` rotas o artefactos
  canónicos duplicados.
- **Seguridad al renombrar**: Al renombrar o mover un archivo dentro de `ai-specs/`,
  verificar y actualizar todas las referencias `{file:...}` que lo apuntan (usar
  `bash check-refs.sh`) antes de cerrar el cambio.
- **Nuevos artefactos**: Al crear un nuevo skill o agente en `ai-specs/`, añadir su
  referencia `{file:...}` donde corresponda en `opencode.json` y registrarlo en
  `ai-specs/README.md`.
- `specboot.sh` valida la estructura, los placeholders y la integridad referencial
  (`check-refs.sh`); no crea symlinks porque el template es OpenCode-only.

## 7. Actualización de artefactos OpenSpec ante cambios post-apply

Si aparece un fix o cambio nuevo después de `/apply` y antes de `/archive`:

1. Actualizar primero los artefactos OpenSpec afectados (scenarios, requirements, tasks.md)
2. Si se necesita regenerar artefactos, ejecutar el paso OpenSpec correspondiente antes de codear
3. Solo implementar código después de que los artefactos reflejen el nuevo requerimiento
4. Re-ejecutar verificación contra artefactos actualizados antes de archivar

**No aplicar fixes directos en código sin actualizar OpenSpec primero.**

## 8. Contexto del proyecto

> Personalización canónica del proyecto Directorio de Empresas de Concón.

### 8.1 Stack

```
Backend:
  Runtime:    Node.js 22 (>=20.19)
  Framework:  NestJS 11.x + TypeScript 5  (REST API modular, completo tipado)
  BaaS:       Firebase (Firestore, Authentication, Storage) vía Admin SDK
              Credenciales via firebase-admin.json en raiz del repo (gitignored)
Frontend:
  Framework:  Angular 20 standalone + @angular/fire 20 + Firebase Web SDK 11
              Lazy loading, OnPush change detection, Reactive Forms, RxJS
  UI stack:
    TailwindCSS v3           → public site (utility-first, tokens from docs/DESIGN.md)
    Angular Material         → panel admin ONLY (futuro, fuera de MVP)
    @angular/google-maps     → vista mapa interactivo
    ngx-skeleton-loader      → estados de carga (skeleton screens)
    lucide-angular           → iconografia (consistente con categorias.icono)
  Design system:
    Nombre:                  "Dunas y Océano" (originado en Stitch, ver docs/DESIGN.md)
    Tokens canónicos:        colores / typography / radii / shadows / spacing
                              docs/DESIGN.md (YAML front-matter + descripción semántica)
    Referencias por pantalla:
                              docs/{home,login,mapa,perfil}/{code.html,screen.jpg}
Cache:        Redis (opcional, fallback memoria) vía @nestjs/cache-manager
Validación:   class-validator + class-transformer (ValidationPipe global whitelist+forbidNonWhitelisted)
Docs API:     OpenAPI 3.0 vía @nestjs/swagger (solo dev, /api/docs)
Rate limiting: @nestjs/throttler (short/medium/long)
Logging:      nest-winston + winston (JSON estructurado)
SOLID lint:   ESLint + dependency-cruiser + madge via templates/ci/ (ver docs/ci-standards.md)
Tests BE:     Jest + Supertest (cobertura objetivo 90%)
Tests FE:     Jasmine + Karma (cobertura objetivo 80%)
Commits:      Conventional Commits validados con commitlint
SDD:          Spec-Driven Development con Specboot (OpenSpec como fuente de verdad)
              Comandos /enrich-us /plan-change /apply /verify /adversarial-review /archive /commit /deploy
Deploy BE:    VPS vía docker compose (Dockerfile + docker-compose.prod.yml)
Deploy FE:    TBD (VPS Nginx o Firebase Hosting, decisión futura)
Dominio:      Directorio de Empresas de Concón (Chile)
Cliente:      Agencia Digital (https://agencia-digital.cl)
Lenguaje código: English | Documentación cliente: Español
Monorepo:     backend/ + frontend/
Arquitectura BE: Clean Architecture por feature
                backend/src/modules/<feature>/{domain, application, infrastructure}
                (ver docs/backend-standards.md Principios de Diseño — Backend)
```

### 8.2 Usuarios / personas

| Usuario | Login | Rol | Función |
|---|---|---|---|
| **Visitante anónimo** | sin login | — | Descubre places por categoría/barrio, abre ficha, ve mapa. No requiere autenticación. Rol implícito del sistema (no se persiste en `usuarios`). |
| **Member registrado** | Firebase Auth | `member` | Usuario autenticado con perfil básico. Acceso de lectura pública completo. Capacidad (futura, deferred al change `auth + usuarios`) de guardar `places` favoritos. NO puede publicar places ni eventos. Reemplaza al rol legacy `usuario`. |
| **Owner de place** | Firebase Auth | `owner` | Se registra, crea su place (genera `solicitud` pendiente), gestiona su ficha (horarios/servicios/redes/logo). Es el usuario operacional central. Crea eventos con `eventos.usuarioId === token.uid`. Reemplaza al rol legacy `empresa`. |
| **Admin del directorio** | Firebase Auth | `admin` | Aprueba/rechaza `solicitudes`, gestiona `categorias` y `barrios`, destaca/verifica places, modera el directorio. |

> **Nota:** 3 roles autenticados (`admin`, `owner`, `member`) + 1 visitante anónimo (sin login, sin persistencia en `usuarios`) coexisten. El enum renombrado cierra desde el change `roles-rename`; la deuda de autenticación (stubs `"anonymous"` y header `x-usuario-id`) se documentó en `docs/data-model.md §usuarios` y se cierra cuando el change MVP `auth + usuarios` aterrice.

> Sin `reviewer` — sistema de reviews/calificaciones queda fuera del MVP (post-MVP).

### 8.3 Flujos de negocio

#### Flujo 1 — Registro de place

1. Owner se registra en Firebase Auth → rol `owner` (asignado vía `usuarios` collection).
2. `POST /api/v1/places` crea el place con `status: pendiente` y genera automáticamente un documento `solicitudes` con `tipo: 'registro'`, `status: 'pendiente'`, `placeId` apuntando al nuevo place.
3. El `admin` revisa la `solicitud`:
   - Aprueba → `solicitud.status: aprobado` + `place.status: aprobado` → visible públicamente.
   - Rechaza → `solicitud.status: rechazado` + `place.status: rechazado` (queda registrado pero oculto).

#### Flujo 2 — Descubrimiento (visitante anónimo)

1. Visitante anónimo entra al home (`docs/home/code.html` referencia visual).
2. Filtra places por `categoriaId`, `barrioId` o query de texto: `GET /api/v1/places?q=&categoriaId=&barrioId=&page=&limit=`.
3. Abre una ficha por `slug`: `GET /api/v1/places/slug/:slug` (`docs/perfil/code.html` referencia visual).
4. Ve el mapa interactivo: `GET /api/v1/places/map-data` (`docs/mapa/code.html` referencia visual).

#### Flujo 3 — Gestión de catálogo (admin)

1. `admin` mantiene `categorias`, `barrios` y `places` mediante CRUD admin (Angular Material en panel admin futuro).
2. Al iniciar el proyecto, `npm run seed` (en `backend/`) pobla Firestore con un inventario fijo de categorías de Concón (Restaurantes, Hospedaje, Servicios, Retail, Salud…) y barrios (Centro, Bosques, Montemar, La Boca, Reñaca Alto…).

### 8.4 Roadmap de módulos

#### MVP — Implementado (change `auth-usuarios`)

1. **`auth`** — Firebase Auth + guards JWT + roles (implementado por el change `auth-usuarios`): módulo `auth` NestJS con `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`, `AuthContext`; sourcing del `rol` desde Firebase custom claim + fallback a Firestore `usuarios`. Cierra las 3 debilidades de autenticación documentadas en `roles-rename` (ver `docs/data-model.md §usuarios` "Authentication debt — [CLOSED]").
2. **`usuarios`** — CRUD de usuarios + vinculación con Auth (implementado por el change `auth-usuarios`): entity `Usuario`, `UsuariosRepository`, `UsuariosService`, `UsuariosController` con `GET /usuarios/me`, `PUT /usuarios/me`, `POST /usuarios` admin, `PUT /usuarios/:uid/rol` admin. El provisioning es admin-only en este change; self-registration via frontend queda para un change futuro `usuarios-self-signup`.

#### MVP — Implementado (change `categorias-barrios-crud`)

3. **`categorias`** — CRUD admin + seed fijo (implementado por el change `categorias-barrios-crud`): módulo NestJS Clean Architecture por feature (`domain/`, `application/`, `infrastructure/`), `CatalogValidator` compartido para validación cross-catálogo en `places`/`eventos` (flag `CATALOG_VALIDATION_ENABLED`), y `npm run seed` funcional que puebla Firestore desde `categorias.json`/`barrios.json` del frontend.
4. **`barrios`** — CRUD admin + seed fijo (implementado por el change `categorias-barrios-crud`): repositorios `BarrioReadRepository`/`BarrioWriteRepository` (ISP ≤5 métodos), toggles activar/desactivar admin, lectura pública `GET /barrios?activo=true`.

#### MVP — Pendiente (en este orden de implementación)

1. **`solicitudes`** — Listado + aprobar/rechazar por admin (cierra el Flujo 1). El `SolicitudesService` ya existe (de `eventos-crud`); el `SolicitudesController` HTTP (endpoints `POST /solicitudes/:id/approve|reject` con `@Roles('admin')`) se introdujo en el change `auth-usuarios` para cerrar la deuda de `revisadoPor`. Pendiente: endpoints de listado/filtrado de solicitudes.
2. **`frontend`** — 4 pantallas del design system "Dunas y Océano":
   - Home / landing → `docs/home/code.html`
   - Auth signup/login → `docs/login/code.html`
   - Vista mapa → `docs/mapa/code.html`
   - Ficha de place → `docs/perfil/code.html`

#### Post-MVP (módulos comentados en `app.module.ts`, no en scope)

- `planes`, `suscripciones`, `pagos` — Monetización freemium con pasarela de pago (no implementada en MVP).
- `recursos-digitales`, `chat-empresarial` — Funcionalidades premium.
- `reviews` — Sistema de calificaciones de visitantes (no `reviewer` como persona separada; cualquier usuario puede calificar).
- `ai` — Generación de descripciones, búsqueda semántica, chatbot recomendador (sin IA en MVP).
- `analytics` — Métricas y analítica.
- `eventos` — Directorio de eventos comunales (colección `eventos`, módulo NestJS Clean Architecture, flujo de aprobación vía `solicitudes` extendido, frontend completo con formulario, listado, ficha y mapa). En implementación activa como change `eventos-crud`.

#### Cambios futuros fuera de MVP

- **Panel admin** + Angular Material UI (cambio OpenSpec separado).
- **`places`** → refactor a Clean Architecture (cambio futuro `places-clean-arch-refactor`).

### 8.5 Fuentes de contexto del proyecto (auxiliares)

El dominio, modelo de datos y convenciones ya están descritos en `.github/instructions/`:
- `.github/instructions/backend-instructions.md` — guía backend NestJS (referencia histórica)
- `.github/instructions/database-instructions.md` — estructura Firestore e índices (referencia histórica)
- `.github/instructions/frontend-instructions.md` — guía frontend Angular (referencia histórica)
- `.github/instructions/ai-instructions.md` — funcionalidades de IA (referencia histórica)
- `.github/instructions/deployment-instructions.md` — despliegue (deprecado por VPS/Docker, referirse a `docs/deploy-standards.md`)

> **Fuente canónica**: `docs/data-model.md` y `docs/api-spec.yml` (sincronizados con OpenSpec y Specboot).
> Design system canónico: `docs/DESIGN.md` "Dunas y Océano" + per-screen exports en `docs/{home,login,mapa,perfil}/`.

## 9. Principios de Diseño No Negociables (SOLID + Composition over Inheritance)

SOLID y composition-over-inheritance son rectores del proyecto. Aplican a **todo** el código nuevo y al código existente que se modifique. Las secciones detalladas por stack están en:

- `backend-standards.md` → **Principios de Diseño — Backend (NestJS)**: Clean Architecture por feature (`domain/`, `application/`, `infrastructure/`), DIP, SRP, OCP, ISP, LSP.
- `frontend-standards.md` → **Principios de Diseño — Frontend (Angular)**: Smart/Dumb components, DIP (no `new HttpClient()`), ISP (selectors específicos), Umbrales de archivos.

**Umbrales objetivos medibles por linters en CI** (ver `templates/ci/` y `docs/ci-standards.md`):

| Métrica | Backend | Frontend |
|---|---|---|
| `max-lines` por archivo | 300 | 400 |
| `complexity` (cyclomatic) | ≤10 | ≤10 |
| `max-params` por función | ≤3 | — |
| `inheritance depth` | ≤2 | — |

Estos umbrales se validan en CI con `make solid-lint` (ESLint + dependency-cruiser + madge, ver `templates/ci/`).
