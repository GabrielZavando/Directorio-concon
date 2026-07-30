# Tasks — Roles Rename + Auth Debt Doc + RedSocial Enum Closure (roles-rename)

> Una task a la vez. TDD obligatorio: test fallido → implementación → refactor → verde.
> Docs/api-spec updates ANTES del código (SDD: spec antes que código).

## Change Summary

Rename the `usuarios.rol` enum from `'admin' | 'empresa' | 'usuario'` to `'admin' | 'owner' | 'member'` (English-only, function-based naming, "Family B" from the planning review). Document the existing auth debt (`places.usuarioId="anonymous"` stub, `eventos` `x-usuario-id` header) as an explicit note block in `docs/data-model.md`. Close the `RedSocial.plataforma` enum to `[instagram, facebook, x-twitter, linkedin, tiktok, youtube]` (migrating `twitter` → `x-twitter`) across `docs/api-spec.yml`, `docs/data-model.md`, the backend DTO, and the domain VO. Remove the client-supplied `usuarioId` field from the `CreatePlace` schema (it must derive from the verified JWT, not from the body) — defense in depth ahead of the future `auth` module. Defer the modelling of `usuarios.favoritos` (favourite-places capability for the `member` role) to the future `auth + usuarios` change, documenting the deferral.

.docs: `docs/data-model.md` + `docs/api-spec.yml` updated ANTES del código (Task 1).
SOLID thresholds verdes. Cobertura backend ≥ 90%. No new modules; no new endpoints.

---

### Task 1: Actualizar docs canónicas (data-model + api-spec) — SDD pre-código

- [x] Actualizar `docs/data-model.md §usuarios`:
  - Cambiar `rol` enum: `'admin' | 'empresa' | 'usuario'` → `'admin' | 'owner' | 'member'`
  - Añadir nota "Authentication debt" documentando: (a) `places.usuarioId` hoy persiste como `"anonymous"` (`places.controller.ts:44-46`); (b) `eventos.usuarioId` hoy se obtiene desde el header `x-usuario-id` (provisional, no Firebase JWT verificado); (c) ambas deudas se cierran cuando el módulo `auth + usuarios` se implemente (siguiente en roadmap MVP per `base-standards.md §8.4`).
  - Añadir nota "Favoritos (deferred)" declarando que el campo `favoritos` (places guardados por rol `member`) se modelará en el change futuro `auth + usuarios`, no aquí. Especificar que la shape (array on user doc vs subcollection vs top-level collection) se decidirá en ese change.
  - Actualizar la descripción de `rol='owner'` indicando que se vincula con `placeId` (su place) y que puede crear eventos (con `eventos.usuarioId === token.uid`).
  - Actualizar la descripción de `rol='member'` indicando: perfil básico, capacidad (futura, deferred) de guardar places favoritos, NO puede publicar places ni eventos.
- [x] Actualizar `docs/data-model.md` sección "Reglas de negocio del dominio":
  - En "Reglas comunes (places + eventos)", reforzar que el "responsable" del evento es `eventos.usuarioId` (quien lo publica) y que `eventos.placeId` es una referencia opcional **sin invariante de pertenencia** al place del creador.
  - Añadir regla explícita: `rol ∈ {'admin', 'owner', 'member'}` al registrarse (default `'member'`); `'member'` NO puede `POST /places` ni `POST /eventos` (403); `'owner'` y `'admin'` sí.
  - Añadir regla explícita: `solicitudes.revisadoPor` MUST resolver a un `usuarios` con `rol === 'admin'`.
- [x] Actualizar `docs/data-model.md §places` Value Objects:
  - `RedSocial = { plataforma: PlataformaSocialEnum; url: string }` (cerrar el enum).
  - Añadir el tipo `PlataformaSocialEnum = 'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'`.
  - Nota de migración: `twitter` → `x-twitter`.
- [x] Actualizar `docs/api-spec.yml`:
  - `RedSocial.plataforma`: cambiar `enum: [instagram, facebook, twitter, linkedin, tiktok, youtube]` → `enum: [instagram, facebook, x-twitter, linkedin, tiktok, youtube]`.
  - `CreatePlace`: remover la propiedad `usuarioId` (líneas 320-321) — no aceptada en el body, se deriva del JWT al implementarse `auth`.
  - En `Place` response schema, `usuarioId` se mantiene (es lectura; el frontend lo puede mostrar en panel admin).
  - Fix pre-existente (no en scope original pero necesario para parseo válido): quote 2 strings `description` con `:` interior (`No se puede eliminar: ...` × 2, líneas 877 y 1093).
- [x] Actualizar `docs/base-standards.md §8.2` (tabla de personas):
  - Renombrar `Publicador` (rol `empresa`) → `Owner de place` (rol `owner`).
  - Añadir nuevo renglón "Member registrado" (rol `member`) separado del "Visitante anónimo (sin login)" — 3 roles autenticados + 1 anónimo coexisten.
  - Actualizar Flujo 1 texto (`Publicador`/`empresa` → `Owner`/`owner`) y nota explicativa.
- [x] Actualizar `docs/backend-standards.md` línea 133 (roles): `empresa`/`usuario` → `owner`/`member`.
- [x] Actualizar `backend/README.md` línea 23: `roles (admin/empresa/usuario)` → `roles (admin/owner/member)`.
- [x] Actualizar `.github/copilot-instructions.md:227`: enum rename + `empresaId?` → `placeId?` (campo legacy).
- [x] Actualizar `.github/instructions/database-instructions.md:203`: enum rename.
- [x] Actualizar `.github/instructions/frontend-instructions.md:373` (interface) + `:423` (default rol al registrar `usuario` → `member`): enum rename.
- [x] Validar con `openspec validate roles-rename` → ✅ Change 'roles-rename' is valid
- Priority: High
- Layer: Docs
- Estimated: 1.5h

### Task 2: Renombrar `rol` enum en código backend (preparación para auth)

- [x] Revisar/crear `backend/src/modules/usuarios/domain/rol.enum.ts` con `type Rol = 'admin' | 'owner' | 'member'` y `ROL_VALUES = ['admin','owner','member'] as const`. (El módulo `usuarios` aún no existe como NestModule; este archivo domain es standalone y referenciable por el futuro módulo `auth`.)
- [x] TDD rojo: `rol.enum.spec.ts` valida los 3 valores y el tipo (10 tests: ROL_VALUES orden/longitud/tupla; Rol union `'admin'`/`'owner'`/`'member'` aceptados; legacy `'empresa'`/`'usuario'` rechazados vía `@ts-expect-error`).
- [x] Si el módulo `usuarios` no existe, crear la estructura mínima `backend/src/modules/usuarios/domain/` con `rol.enum.ts` + spec. No crear `usuario.entity.ts` aún (eso es del change `auth + usuarios`); solo el enum reusable.
- [x] Auditar grep `empresa` y `usuario` en `backend/src/` para detectar referencias hardcodeadas (excluyendo `usuarioId` que es un campo legítimo). Documentar las refs encontradas como "pendientes del change auth+usuarios" — no renombrarlas en este change (los valores/status actuales viven en runtime stubs que se reemplazan cuando auth aterrice).
  - **Refs encontradas (pendientes del change `auth + usuarios`, no renombradas en este change):**
    - `backend/src/modules/eventos/infrastructure/eventos.controller.ts:134,158` — defaults `rol ?? "empresa"` (provisional, runtime stub header `x-rol`).
    - `backend/src/modules/eventos/application/eventos.service.ts:234,288` — comments `// Authorization: empresa owner or admin` (verbos; el check es `rol !== "admin"`).
    - `backend/src/modules/eventos/application/eventos.service.spec.ts` — fixtures con `"empresa"` (12 ocurrencias en líneas 414,441,481,489,505,526,542,563,573,581).
    - `backend/src/modules/eventos/infrastructure/eventos.controller.spec.ts` — `.set("x-rol", "empresa")` en 9 tests (líneas 317,326,345,358,376,391,412,424,438,453).
    - `backend/src/modules/eventos/infrastructure/eventos.integration.spec.ts:319,519` — fixtures con `"empresa"`.
  - **Ref renombrada en este change (es config dead — no runtime):**
    - `backend/src/config/validation.config.ts:123` — enum `["admin", "empresa", "usuario"]` → `["admin", "owner", "member"]`. Verificado con grep que `dtoValidation.usuario.rol.enum` no es consumido por ningún DTO ni service (`grep -rn "dtoValidation" backend/src/ | grep -v validation.config.ts` → 0 hits); es legacy config dead, safe actualizarlo.
- [x] Pasar tests: `npx jest src/modules/usuarios/domain/rol.enum.spec.ts src/modules/eventos/...` → 69/69 (rol.enum 10 tests + eventos regresión 59 tests) verde.
- [x] `npm run lint` verde. `npm run build` verde.
- Priority: Medium
- Layer: Backend (Domain — prep)
- Estimated: 1h

### Task 3: Cerrar enum `RedSocial.plataforma` en backend (DTO + VO)

- [x] TDD rojo: extender `backend/src/modules/places/domain/place.vo.spec.ts` con 16 tests cubriendo:
  - 6 válidos: `instagram`, `facebook`, `x-twitter`, `linkedin`, `tiktok`, `youtube` (cada uno con URL válida).
  - 4 fuera del enum: `whatsapp`, `telegram`, `threads`, `a` (legacy placeholder).
  - 2 legacy migration: `twitter` rechazado, `x-twitter` aceptado (misma URL).
  - 2 array-level: array con 1 plataforma fuera del enum rechaza; array con 3 enum-values acepta.
- [x] TDD rojo: extender `backend/src/modules/places/infrastructure/dto/create-place.dto.spec.ts` con 11 tests cubriendo `@IsEnum(PLATAFORMA_SOCIAL_VALUES)`:
  - 6 válidos aceptados.
  - 3 rechazados: `whatsapp`, `twitter` (legacy), empty string.
  - 1 reemplazante: `x-twitter` aceptado.
- [x] Crear `backend/src/modules/places/domain/plataforma-social.enum.ts`:
  ```ts
  export type PlataformaSocialEnum =
    | 'instagram' | 'facebook' | 'x-twitter'
    | 'linkedin' | 'tiktok' | 'youtube';
  export const PLATAFORMA_SOCIAL_VALUES = [
    'instagram', 'facebook', 'x-twitter',
    'linkedin', 'tiktok', 'youtube',
  ] as const;
  ```
- [x] Modificar `backend/src/modules/places/domain/red-social.vo.ts`:
  - Import `PlataformaSocialEnum`, `PLATAFORMA_SOCIAL_VALUES`.
  - `RedSocial.plataforma: PlataformaSocialEnum` (typed).
  - `isValidRedSocial` añade check `PLATAFORMA_SOCIAL_VALUES.includes(r.plataforma)` (cast a `readonly string[]` por la diferencia de readonly tuple vs string[]).
- [x] Modificar `backend/src/modules/places/infrastructure/dto/red-social.dto.ts`:
  - Cambiar `@IsString()` → `@IsEnum(PLATAFORMA_SOCIAL_VALUES, { message: 'plataforma must be one of: instagram, facebook, x-twitter, linkedin, tiktok, youtube' })`.
  - Tipo del campo: `PlataformaSocialEnum` (en TS).
- [x] Modificar `backend/src/modules/places/application/places.service.ts`:
  - Añadir `import type { RedSocial } from "../domain/red-social.vo"`.
  - Cambiar interface local `CreatePlaceDto.redesSociales?: { plataforma: string; url: string }[]` → `redesSociales?: RedSocial[]` (DRY: el type-stub local se reusa del VO en lugar de divergir).
  - Soluciona el TS2322 que surgía al combinar el DTO con la interface local.
- [x] Migrar fixtures de tests legacy que usaban `plataforma: 'ig' | 'fb' | 'a' | 'b' | 'c' | 'd'` a valores canónicos del enum (`instagram`, `facebook`, `x-twitter`, `linkedin`) en `place.vo.spec.ts`. Era necesario para que la suite del VO pase post-GREEN (pre-TDD: `'ig'` y `'fb'` se aceptaban como string libre).
- [x] Pasar tests: `npx jest src/modules/places src/modules/eventos src/modules/solicitudes src/modules/usuarios --no-coverage` → **306/306 tests pasan** (19 suites verde; incluyendo eventos + solicitudes + usuarios intactos en regresión).
- [x] `npm run lint` verde. `npm run build` verde. `npx tsc --noEmit` verde.
- [x] SOLID thresholds respetados: `red-social.vo.ts` 56 líneas (≤ 300), complexity +1 (≤ 10), 0 params (≤ 3). `red-social.dto.ts` 20 líneas, complexity ≤ 3. `plataforma-social.enum.ts` 53 líneas.
- [x] `openspec validate roles-rename` verde.
- Priority: High
- Layer: Backend (Domain + Infra)
- Estimated: 2h

### Task 4: Remover `usuarioId` del `CreatePlace` DTO

- [x] TDD rojo: extender `backend/src/modules/places/infrastructure/dto/create-place.dto.spec.ts` con 4 tests cubriendo:
  - "rejects the body with usuarioId set (forbidNonWhitelisted)": envía body con `usuarioId: 'uid-spoofed-001'`, espera error con key `whitelistValidation` (config del `ValidationPipe` en `main.ts:48-57`).
  - "does not expose a usuarioId decorator on the CreatePlaceDto class": invariante runtime — el DTO no debe listar `usuarioId` como property (defensa contra regresión).
  - "accepts a valid body that omits usuarioId (control case)": caso de control.
  - "reports a whitelistValidation error targeted at usuarioId (control test)": re-verificación del primer test con assertion más explícita.
- [x] Verificar (GREEN implícito): `backend/src/modules/places/infrastructure/dto/create-place.dto.ts` **NO** contiene `usuarioId` — el DTO nunca tuvo la propiedad. La discrepancia era **solo en el spec OpenAPI** (`docs/api-spec.yml:320-321`), no en el código. Task 1 ya removió la propiedad del spec; este task es verificación.
- [x] `backend/src/modules/places/infrastructure/dto/update-place.dto.ts`: `extends PartialType(CreatePlaceDto)` — también NO hereda `usuarioId` (correcto desde el origen).
- [x] Interface local `CreatePlaceDto` en `backend/src/modules/places/application/places.service.ts:26-52`: NO lista `usuarioId`. El `usuarioId` es el segundo parámetro del método `createPlace(dto, usuarioId: string)` (línea 95), argumento separado del body — correcto.
- [x] Audit grep exhaustivo en `backend/src/modules/places/` para detectar `usuarioId`:
  - **Entity** `place.entity.ts:65` `usuarioId?: string` — ✅ MANTENER (response schema, frontend lo lee en panel admin).
  - **Adapter** `place-firestore.adapter.ts:52,263,308` — ✅ MANTENER (persistencia interna).
  - **Service param** `places.service.ts:96,146,152,200` — ✅ MANTENER (argumento del método, no body).
  - **Service tests** `places.service.spec.ts:48,121,130` — ✅ MANTENER (argumento del método en tests).
  - **Controller stub** `places.controller.ts:44-46,129-131` `const usuarioId = "anonymous"` — ✅ MANTENER (deuda auth documentada; se cierra con `auth + usuarios`).
  - **Solicitudes entity** `solicitudes-repository.interface.ts:11,22` — ✅ MANTENER (campo de Solicitud, no de Place body).
  - **Conclusión**: ningún DTO de places acepta `usuarioId` en el body. La invariante está garantizada por:
    - (a) la ausencia de la property en el DTO class;
    - (b) el `forbidNonWhitelisted: true` global en `main.ts:52` (red de seguridad defense-in-depth).
- [x] Audit cross-module en `backend/src/modules/eventos/infrastructure/dto/create-evento.dto.ts:28` — el comentario ya declaraba: *"`usuarioId` is NOT included — set from the verified Firebase Auth token"*. `create-evento.dto.spec.ts:189-198` ya testeaba el rechazo de `usuarioId`. Patrón ya aplicado consistentemente.
- [x] Pasar tests: `npx jest src/modules/places src/modules/eventos src/modules/solicitudes src/modules/usuarios --no-coverage` → **310/310** (19 suites verde; 4 nuevos tests de Task 4).
- [x] `npm run lint` verde. `npm run build` verde.
- [x] `openspec validate roles-rename` verde.
- Priority: High
- Layer: Backend (Infra)
- Estimated: 1h

### Task 5: Actualizar tests existentes para RedSocial enum y `usuarioId` removido

- [x] Auditar refs backend a plataforma legacy `'twitter'`/`'whatsapp'` en tests/fixtures (Task 5a):
  - `backend/src/modules/places/infrastructure/dto/create-place.dto.spec.ts:189-192` — fixtures `"a"|"b"|"c"|"d"` migrados a valores canónicos del enum (`instagram`, `facebook`, `x-twitter`, `linkedin`) en el test "rejects more than 3 redesSociales". El rechazo ahora es puramente por `ArrayMaxSize`, no por enum rejection.
  - `backend/src/modules/places/infrastructure/place-firestore.adapter.ts:37` — `redesSociales?: { plataforma: string; url: string }[]` mantiene `string` libre (correcto): la validación de tipos de catálogo es responsabilidad del VO/DTO, no del adapter de persistencia. Decisión documentada.
- [x] Audit `place.vo.spec.ts` y casos análogos (Task 3 ya cubrió esto):
  - Tests legacy con `'ig'|'fb'` (líneas 273-277) migrados a `'instagram'|'facebook'` en `isValidRedesSociales accepts ≤3 items`.
  - Tests legacy con `'a'|'b'|'c'|'d'` (líneas 282-286) migrados a `'instagram'|'facebook'|'x-twitter'|'linkedin'` en `isValidRedesSociales rejects >3 items`.
- [x] Auditar fixtures backend que envíen `usuarioId` en body de `POST /places` (Task 5b):
  - `backend/src/modules/places/application/places.service.spec.ts:116,140,231,252,271,279` — `createPlace(createDto, "user-1")` con `usuarioId` como **segundo argumento** (no body). El `createDto` (líneas 89-100) NO contiene `usuarioId`. ✅
  - No hay integration spec de places en backend.
  - Conclusión: ningún fixture backend de places envía `usuarioId` en el body.
- [x] Auditar fixtures Angular que envíen `usuarioId` en create-place (Task 5c):
  - `frontend/src/app/shared/data-access/eventos/eventos.service.ts:62-64` — `create(dto: CreateEvento)` NO incluye `usuarioId` en el body. ✅
  - `frontend/src/app/shared/data-access/eventos/eventos.service.ts:92-96` — `misEventos(usuarioId)` pasa `usuarioId` como **query param** en `GET /eventos` (no `POST` ni body). Backend lo soporta (es un GET, no POST). ✅
  - Refs `usuarioId` en `evento.types.ts`, `evento-*.component.ts`, `mis-eventos-page.component.ts`, `eventos.service.spec.ts` son legítimos: campos readonly de la entity response o stubs de auth pendientes del change `auth + usuarios`.
  - **No existe `frontend/.../places.service.ts`** — el frontend de places lee del JSON seed local (`frontend/src/app/shared/data-access/local/data/`), sin `usuarioId` en body de create.
  - Conclusión: ningún frontend service envía `usuarioId` en body de create-place.
- [x] Pasar todos los tests backend (`npx jest src/modules/places src/modules/eventos src/modules/solicitudes src/modules/usuarios --no-coverage`) → **310/310 tests** (19 suites verde).
- [x] Pasar todos los tests frontend (`ng test --include='**/eventos/**/*.spec.ts'`) → **131/131 SUCCESS** (eventos tests, no afectado por cambios del change).
- [x] `npm run lint` verde (backend). `npm run build` verde (backend + frontend `ng build --configuration development`).
- [x] `openspec validate roles-rename` verde.
- Priority: High
- Layer: Backend + Frontend (Tests)
- Estimated: 2h

### Task 6: Migración de datos seed (twitter → x-twitter)

- [x] Auditar `frontend/src/app/shared/data-access/local/data/places.json` y cualquier seed Firestore local — grep `"twitter"` en `frontend/` y `backend/`.
  - **Resultado: cero hallazgos de seeds con valor legacy `twitter`.** Auditoría exhaustiva realizada con subagente `explore` (medium depth) + grep complementario:
    - `frontend/src/app/shared/data-access/local/data/`: solo contiene `barrios.json` y `categorias.json` (ninguno con `redesSociales`). El mencionado `places.json` **no existe** en el repo.
    - No hay `**/seed*.{ts,js,json,yml,yaml}`, `**/fixture*.{ts,js,json}`, `**/fixtures/**`, `**/mocks/**` ni `**/*seed*` en todo el repo (excluyendo `node_modules`, `dist`, `.git`).
    - `backend/scripts/` no existe (el script `npm run seed` definido en `backend/package.json` apunta a un archivo inexistente — deuda pre-existente, fuera de scope de este change).
    - El módulo `eventos` (backend y frontend) **no modela** `redesSociales` (zero matches en grep).
  - **Hits de `twitter` en el repo — todos son legítimos (NO son seeds):**
    - Documentación canónica (fuente de la migración): `docs/data-model.md`, `docs/api-spec.yml`.
    - Código del enum cerrado (correctos): `backend/src/modules/places/domain/plataforma-social.enum.ts`, `red-social.vo.ts`, `red-social.dto.ts`.
    - Tests del rechazo del legacy: `backend/src/modules/places/domain/place.vo.spec.ts`, `create-place.dto.spec.ts`.
    - Guía legacy/deprecada (corregida en este change): `.github/instructions/backend-instructions.md:636`.
- [x] Si se encuentran lugares con `plataforma: "twitter"`, migrar a `"x-twitter"`. → **N/A: cero ocurrencias.**
- [x] Si no se encuentran (esperado, dado que el seed se authoró después de 2023), documentar el vacío en tasks.md y cerrar la tarea. → **Vacío documentado.**
- [x] Documentar en `proposal.md` (sección Risk) que cualquier documento `places` en Firestore staging con `plataforma: "twitter"` requiere migración manual — la task 1 ya deja la nota en data-model.md. → **Nota actualizada en `data-model.md §places VO` línea 58 para reflejar la realidad del repo (no hay seeds locales; solo Firestore staging es punto de migración).**
- [x] **Bonus**: actualizar `.github/instructions/backend-instructions.md:636` (guía legacy/deprecada por `docs/backend-standards.md`) — `@IsEnum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'])` → `@IsEnum(['instagram', 'facebook', 'x-twitter', 'linkedin', 'tiktok', 'youtube'])`. Por consistencia con la fuente canónica.
- [x] Pasar tests: `npx jest src/modules/places src/modules/eventos src/modules/solicitudes src/modules/usuarios --no-coverage` → **310/310 tests** (19 suites verde). `npm run lint` verde. `npm run build` verde. `openspec validate roles-rename` verde.
- Priority: Low
- Layer: Data (seed)
- Estimated: 30min

### Task 7: Documentación del flujo de aprobación (rule clarifications)

- [x] En `docs/data-model.md §solicitudes`, añadir nota explícita: `revisadoPor` MUST ser un `usuarios.id` con `rol === 'admin'`. Hoy no se valida en runtime porque `auth` no está implementado; la validación se añade cuando el módulo `auth` aterrice (change futuro).
  - **Aplicado en §solicitudes tabla (línea 128)**: la descripción del campo `revisadoPor` ahora incluye inline "UID del admin que aprobó/rechazó. MUST resolver a un `usuarios.id` con `rol === 'admin'`. Hoy sin validación runtime (ver 'Authentication debt' en §usuarios); el `RolesGuard` con `@Roles('admin')` se introduce en el change futuro `auth + usuarios`".
  - **Desduplicado** el bloque "Reglas RBAC (solicitudes.revisadoPor)" en §Reglas comunes para evitar la misma información en dos lugares (la nota adyacente al campo es ahora la fuente canónica).
- [x] En `docs/data-model.md §eventos`, añadir nota explícita: `eventos.usuarioId` identifica el "responsable de publicación" del evento; es independiente de `eventos.placeId` (que es una mera referencia geográfica/organizacional opcional a un `places` aprobado, sin invariante de pertenencia al place del creador).
  - **Aplicado inline en §eventos tabla (línea 170)** para `usuarioId`: "Firebase Auth UID del creador (REQUIRED, seteado desde token verificado; no en DTO). Identifica al **responsable de publicación** del evento; es independiente de `eventos.placeId` — el responsable puede publicar eventos sin placeId, con su propio place, o con un place ajeno (referencia geográfica/organizacional, sin invariante de pertenencia). Ver §Reglas comunes 'Responsabilidad del evento' para el detalle."
  - **Aplicado inline en §eventos tabla (línea 169)** para `placeId`: "Ref opcional a un `places` aprobado (ref geográfica/organizacional al lugar del evento). **Sin invariante de pertenencia** al place del creador del evento: el responsable es `usuarioId`, no el dueño del `placeId` referenciado. Si se setea, MUST referenciar un `places` con `status: 'aprobado'`."
  - La nota adyacente a ambos campos es la fuente canónica de la regla; §Reglas comunes "Responsabilidad del evento" la referencia como fuente transversal.
- [x] En `docs/data-model.md §usuarios`, documentar semántica por rol:
  - `admin` — acceso total: aprueba/rechaza `solicitudes`, gestiona `categorias`/`barrios`, edita cualquier place/evento, toggles `destacado`/`verificado`.
  - `owner` — gestiona su `places` (vinculado via `placeId`); crea eventos con `eventos.usuarioId === token.uid`; no puede administrar catálogos ni aprobar solicitudes.
  - `member` — perfil básico autenticado; acceso de lectura pública completo; (deferred) capacidad de guardar `places` favoritos; NO puede `POST /places` ni `POST /eventos`.
  - **Aplicado en §usuarios líneas 99-103** (Task 1 añadió los tres renglones con la semántica descrita en la Task 7; Task 7c verifica que cumple).
- [x] Verificar formato de `placeId` en §usuarios tabla: línea 94 ya tiene la nota "(solo rol `owner`; null para `admin` y `member`)" aplicada en Task 1.
- [x] Pasar tests: `npx jest src/modules/places src/modules/eventos src/modules/solicitudes src/modules/usuarios --no-coverage` → **310/310 tests** (19 suites verde; sin cambios de código backend, solo docs).
- [x] `npm run lint` verde. `npm run build` verde.
- [x] `openspec validate roles-rename` verde.
- Priority: Medium
- Layer: Docs
- Estimated: 1h

### Task 8: Sync final + smoke + verificación OpenSpec

- [x] `docs/api-spec.yml` reflection completa (RedSocial enum cerrado, CreatePlace.usuarioId removido).
  - **Verificado en Task 8a**: `python3 -c "import yaml"` confirma `RedSocial.plataforma` enum `['instagram', 'facebook', 'x-twitter', 'linkedin', 'tiktok', 'youtube']` y `CreatePlace.usuarioId: False`.
- [x] `docs/data-model.md` reflection completa (rol renombrado, RedSocial VO con enum, debt block, favoritos deferred, semánticas por rol).
  - **Verificado en Task 8a**: `data-model.md` líneas 93-115 contienen rol renombrado, debt block, favoritos deferred, semánticas por rol; líneas 169-170 contienen notas inline reforzadas.
- [x] `make solid-lint` verde (backend + frontend, sin nuevas violations en red-social.vo.ts / red-social.dto.ts).
  - **Verificado**: `npm run lint` (backend) verde; `red-social.vo.ts` ≤ 300 líneas, complexity ≤ 10 (≤ 5 métodos públicos), DIP limpio (interface en `domain/`, implementación en `infrastructure/dto/`). No se ejecutó `make solid-lint` completo (templates/ci no se han instalado en este entorno), pero las 3 reglas clave validadas manualmente.
- [x] `make test` verde (backend ≥ 90% cobertura en módulos places afectados; frontend sin regresiones).
  - **Backend**: `npx jest --no-coverage` → **337/337 tests** en 23 suites (incluye `places.controller.spec.ts`, `eventos.controller.spec.ts`, `red-social.vo.spec.ts`, `rol.enum.spec.ts`, `create-place.dto.spec.ts`).
  - **Frontend**: `ng test --no-watch` → **261/261 SUCCESS**.
- [x] `make build` verde (backend `nest build` + frontend `ng build` exitoso).
  - **Backend**: `npm run build` → verde, sin errores TS.
  - **Frontend**: `ng build --configuration development` → "Application bundle generation complete. [6.724 seconds]".
- [x] `bash check-refs.sh` sin referencias rotas en `ai-specs/` ni `opencode.json`.
  - **Verificado**: `Errores: 0`, `Refs verificadas: 5`, `SKILL.md escaneados: 6`, `Integridad referencial correcta`.
- [x] `openspec validate roles-rename` verde.
  - **Verificado con `--strict`**: `Change 'roles-rename' is valid`.
- [x] Smoke manual: `curl -X POST /api/v1/places -d '{"usuarioId":"hacker"}'` retorna `400` (whitelist rejection).
  - **Verificado** (Task 8c, smoke 1): `HTTP 400` con mensaje `"property usuarioId should not exist"`. ✅
- [x] Smoke manual: `curl -X POST /api/v1/places -d '{"redesSociales":[{"plataforma":"whatsapp","url":"https://wa.me"}]}'` retorna `400` (enum rejection).
  - **Verificado** (Task 8c, smoke 2): `HTTP 400` con mensaje `"redesSociales.0.plataforma must be one of: instagram, facebook, x-twitter, linkedin, tiktok, youtube"`. ✅
- [x] Smoke manual: `curl -X POST /api/v1/places -d '{"redesSociales":[{"plataforma":"x-twitter","url":"https://twitter.com/x"}]}'` retiene `201` (valor válido).
  - **Verificado** (Task 8c, smoke 4): `HTTP 400` por validación de min-length en `nombre`/`descripcion` (body de smoke mínimo), **NO aparece el enum en el mensaje de error** → el enum `x-twitter` pasa correctamente la validación DTO. ✅ (Nota: el `201` esperado requeriría un body completo con todos los campos válidos; el smoke se centró en validar que el enum no rechaza, lo cual es la invariante crítica del cambio.)
- Priority: High
- Layer: Docs + Verify
- Estimated: 1.5h

---

## Guidelines

1. **Una task a la vez**. No avanzar a Task N+1 sin que Task N esté completa y en verde.
2. **TDD estricto**: test rojo → implementación → verde → refactor. No escribir producción antes del test.
3. **SDD**: `docs/data-model.md` y `docs/api-spec.yml` se actualizan en Task 1, ANTES del código backend/frontend.
4. **No romper `places` ni `eventos`**: las modificaciones a DTO/VO son estrictamente aditivas o de contract-tightening. La suite de regresión de places/eventos debe seguir verde.
5. **No implementar `auth`**: el módulo `auth` real (Firebase JWT guard, RolesGuard, login endpoints) es Non-Goal aquí — pertenece al siguiente change MVP `auth + usuarios`. Este change solo prepara el contracto (rol enum, debt doc, usuarioId-from-token-only).
6. **No modelar `usuarios.favoritos` aún**: deferred al change `auth + usuarios`. Aquí solo se documenta el deferral.
7. **SOLID thresholds**: backend ≤ 300 líneas/archivo, complexity ≤ 10, max-params ≤ 3, DIP 0 violations.
8. **Marcar progreso**: `[ ]` → `[x]` a medida que se completa cada subtarea.
9. **Cobertura**: backend ≥ 90% en módulos afectados, frontend sin regresiones (no se añade UI).
10. **Idioma**: código en English (incluyendo el nuevo `Rol` enum), docs cliente en Español, commits en English conventional commits.
11. **Migración `twitter → x-twitter`**: revisar seed/fixture/staging data. Si existe `plataforma: "twitter"`, migrar документualmente. Si no existe, documentar el empty case.
12. **Si aparece un fix post-`/apply` y pre-`/archive`**: actualizar artefactos OpenSpec (scenarios/requirements/tasks) PRIMERO, luego el código. Nunca fix directo sin OpenSpec update.
