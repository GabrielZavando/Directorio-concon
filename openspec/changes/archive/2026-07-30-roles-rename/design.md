# Design — Roles Rename + Auth Debt Doc + RedSocial Enum Closure (roles-rename)

> Decisiones de diseño y trade-offs. Referencia: `proposal.md`, `docs/backend-standards.md` (Clean Architecture por feature), `docs/frontend-standards.md`, `docs/data-model.md`.

## 1. Alcance

This change es **contractual y semántico**, no funcional. No añade endpoints, no añade UI, no implementa `auth`. Cuatro frentes:

1. Renombrar el enum `usuarios.rol` (`'admin' | 'empresa' | 'usuario'` → `'admin' | 'owner' | 'member'`).
2. Documentar la deuda de autenticación existente (stub `anonymous`, header `x-usuario-id`, `revisadoPor` sin guard) como nota explícita en `data-model.md`.
3. Cerrar el enum `RedSocial.plataforma` (con migración `twitter` → `x-twitter`).
4. Remover `usuarioId` del body de `CreatePlace` (defensa en profundidad antes de `auth`).

Más el deferral explícito de `usuarios.favoritos` al change futuro `auth + usuarios`.

## 2. Modelado de datos

### 2.1 Renombrado del enum `rol`

**Estado previo**: `'admin' | 'empresa' | 'usuario'` (mezcla inglés/español, `empresa` acoplado al concepto "negocio", `usuario` genérico).

**Estado final**: `'admin' | 'owner' | 'member'` (Family B del review de planning).

**Por qué Family B y no Family A (`admin / publisher / member`)**:
- `owner` es autoexplicativo: posee un `places` (vinculado via `usuarios.placeId`). El frente del directorio habla recurring de "dueño de place" / "dueño de empresa" en el contexto Concón.
- `publisher` describe función, no entidad — útil si el directorio eventu añade otros contenidos publicables. Pero en el horizonte actual del proyecto (places + eventos, nada más en plan), `owner` es más inmediato y laFunction-Based Naming benefit de `publisher` no se materializa.
- El stakeholder prefiere claridad dominial ("dueño") sobre claridad funcional ("publicador"). Confirmado en la decisión de planning.

**Por qué no Family C (`user_admin / user_place / user_visitante`)**:
- Prefijo `user_` redundante — todos los valores son usuarios del sistema.
- `user_visitante` estaría en español, violando `base-standards.md §2` ("Todo en inglés").
- `user_place` acopla el rol al nombre de la entidad `places` — si la entidad se renombra en el futuro ( ya sucedió: `empresas` → `places`), el rol queda desactualizado. (Lección aprendida del propio rename `empresas-crud` → `places`.)

**Migración**: la colección `usuarios` en Firestore **no tiene documentos hoy** (el módulo `usuarios` no está implementado). Por tanto el rename es **schema-only, zero data migration**. Cuando `auth + usuarios` aterrice, los registros nuevos empiezan con los valores nuevos directamente.

### 2.2 `eventos.placeId` — referencia opcional sin invariante de ownership

**Decisión**: `eventos.placeId` queda como **referencia opcional libre** a cualquier `places` aprobado. No se añade la invariante "placeId debe ser el place del creador".

**Justificación**: el responsable del evento es `eventos.usuarioId` (quien publica). `placeId` representa el *lugar* donde ocurre el evento, no el *autor* del evento. Casos válidos:

- Owner del place A crea un evento en el place A (caso común).
- Owner del place A crea un evento en el place B (por ejemplo, festival comunitario organizado en restaurante reconocido).
- Owner sin place crea un evento (festival en playa, sin venue en directorio) — `placeId: null`.

Restringir `placeId` al place del creador rompería los dos últimos casos y contradice el flujo municipal de Concón (eventos en espacios públicos sin lugar listado).

**No es código nuevo**: `eventos-crud` ya implementó este comportamiento. Este change solo lo **aclara en el spec** (`eventos/spec.md` delta) para que futuras implementaciones/auth no reintroduzcan la restricción por error.

### 2.3 Auth debt — documentar, no accionar

**Deuda 1**: `places.controller.ts:44-46`
```ts
// TODO: extract usuarioId from JWT guard (Task auth module)
const usuarioId = "anonymous";
```
El campo `places.usuarioId` se persiste con el string literal `"anonymous"` sin importar quién llama `POST /places`.

**Deuda 2**: `eventos.controller.ts:50,132,156`
```ts
throw new UnauthorizedException("x-usuario-id header is required");
```
El `usuarioId` se saca del header `x-usuario-id`, seteable por el cliente. No es Firebase JWT verificado.

**Deuda 3**: `SolicitudesService` no valida que `revisadoPor` tenga `rol === 'admin'` antes de mutar `status` a `'aprobado'`/`'rechazado'`.

**Decisión**: este change **no** las cierra. Las documenta en `data-model.md` como "Authentication debt" block, referenciando al change futuro `auth + usuarios` como cierre. Razones:

1. Cerrarlas requiere implementar `AuthModule` (Firebase JWT verify + `RolesGuard` + `JwtAuthGuard`). Eso es **un change entero**, no un sub-producto de `roles-rename`.
2. Forzarlo aquí inflaría el scope y mezclaría concerns (renombrado de enum + cierre de deuda de auth).
3. La deuda YA está documentadayá en código (TODO comments); materializarla en el **modelo canónico** (`data-model.md`) eleva su visibilidad para que el siguiente dev no se sorprenda.

El cambio **sí** cierra una brecha de seguridad lateral: remover `usuarioId` del `CreatePlace` body (sección 2.4). Cuando `auth` aterrice y reemplace `"anonymous"` por `req.user.uid`, el body ya no llevará `usuarioId` → no hay vector de spoofing.

### 2.4 `CreatePlace.usuarioId` removido

**Estado previo**: `api-spec.yml:320-321` lista `usuarioId` como propiedad aceptada de `CreatePlace`. El backend lo ignora (sobrescribe con `"anonymous"`), pero el spec **promete** al cliente que puede enviarlo.

**Riesgo si se deja**: cuando `auth` aterrice, una implementación naíf del controller podría hacer `place.usuarioId = dto.usuarioId ?? req.user.uid`, abriendo vector de escalación: el cliente envía `usuarioId: 'uid-de-otro-owner'` y "roba" la autoría del place.

**Decisión**: quitar el campo del spec y del DTO **ahora**, antes de `auth`. El `ValidationPipe` global ya tiene `forbidNonWhitelisted: true`, así que cualquier cliente que lo envíe recibe `400`. Cuando `auth` aterrice, el controller simplemente usa `req.user.uid` — no hay campo del body que tocar.

### 2.5 `usuarios.favoritos` — deferred

**Estado previo**: el campo no existe (ni en doc, ni en código). El requerimiento del stakeholder (`user_visitante` puede "guardar sus places favoritos") lo introduce.

**Decisión**: **no** modelar el campo en este change. Documentar el deferral en `data-model.md §usuarios`.

**Razón**: la shape de almacenamiento (array en doc `usuarios` vs subcolección vs colección top-level) depende de patrones de acceso que solo se clarifican al implementar `auth + usuarios` (queries frecuentes: "favoritos de este usuario" vs "qué usuarios guardaron este place"). Decidir ahora, sin esos datos, incluiría un campo que quizás se refactorice en 60 días. Es mejor deferir y documentar las 3 opciones para que el equipo las evalúe en su contexto.

### 2.6 Cierre de enum `RedSocial.plataforma`

**Estado previo** (3 fuentes divergentes):
- `api-spec.yml:105`: enum cerrado de 6 valores `[instagram, facebook, twitter, linkedin, tiktok, youtube]`
- `data-model.md §places` VO: `plataforma: string` (libre)
- `red-social.dto.ts:4`: `@IsString()` (acepta cualquier string no vacío)
- `red-social.vo.ts:15`: solo valida `typeof === 'string' && length > 0`

**Estado final**: enum cerrado de 6 valores en las 4 fuentes, **sincronizadas**. Valor `twitter` migrado a `x-twitter`.

**Justificación del cierre** (Opción A del review, no la B de plataforma libre):
1. **Consistencia**: `RedSocial.plataforma` era el único campo tipo catálogo sin enum cerrado en `places`. Los demás (`ServicioEnum`, `MetodoPagoEnum`, `PublicoObjetivoEnum`, `AccesibilidadEnum`, `NivelRuido`, `PrecioTipo`, `PrecioMoneda`) todos son enums cerrados. Inconsistencia interna rota.
2. **Frontend**: `frontend-standards.md §1` exige iconografía `lucide-angular` consistente. Sin enum, los iconos rompen ante cualquier valor fuera del mapa.
3. **Datos limpios**: para queries futuras "qué places tienen Instagram", un enum garantiza valores homogéneos. Sin enum, `"ig"`, `"Instagram"`, `"INSTAGRAM"` son distintos.
4. **Spec honesto**: `api-spec.yml` ya prometía enum; este change hace que el backend cumpla lo que el spec dice (en lugar de lo contrario, que es peor).

**Migración `twitter → x-twitter`**: plataforma renombrada en julio 2023. El enum actual ya está desactualizado. Mover a `x-twitter` alinea spec con realidad.

**Riesgo**: cualquier documento `places` en Firestore staging con `plataforma: "twitter"` queda inválido. Mitigación: Task 6 audita seeds (`frontend/.../places.json`) y cualquier fixture; el conteo esperado es **cero** (seed authorado post-2023), documentado si es el caso.

**Si más adelante necesitamos `whatsapp`, `threads`, `telegram`**: enum extensível en un change posterior (aditivo, no breaking). Mejor que cerrar ahora (consistencia) y agregar luego por necesidad, que mantener libre para siempre (heterogeneidad perpetua).

## 3. Backend — Clean Architecture por feature

### 3.1 Sin nuevo módulo NestJS

Este change **no** crea `backend/src/modules/usuarios/` como NestModule. Solo introduce un archivo `domain` standalone:

```
backend/src/modules/usuarios/domain/
├── rol.enum.ts          ← NEW: type Rol + ROL_VALUES const
└── rol.enum.spec.ts     ← NEW: valida los 3 valores
```

**Por qué no módulo completo**: el módulo `usuarios` (entity, repository, service, controller, DTO, module wiring) es **entero** del change futuro `auth + usuarios`. Introducirlo ahora inflaría `roles-rename` con concerns que no le pertenecen (mapper Auth UID → doc, registro endpoint, asignación de `rol`, etc.). El enum `rol` sí es referenciable desde ya por cualquier futuro Guard que lo necesite, sin esperar al módulo completo.

**DIP**: el enum en `domain/` es puro TS sin imports de framework (`firebase-admin`, `class-validator`, `@nestjs/*`), cumpliendo DIP. El futuro `RolesGuard` (cuando `auth` aterrice) lo importará como dependencia de dominio.

### 3.2 Cambios en `places` domain/infra

- **NUEVO** `backend/src/modules/places/domain/plataforma-social.enum.ts` — `PlataformaSocialEnum` + `PLATAFORMA_SOCIAL_VALUES`. Puro TS, sin imports framework.
- **MOD** `backend/src/modules/places/domain/red-social.vo.ts` — `RedSocial.plataforma` tipado como `PlataformaSocialEnum`; `isValidRedSocial` añade `PLATAFORMA_SOCIAL_VALUES.includes(r.plataforma)`.
- **MOD** `backend/src/modules/places/infrastructure/dto/red-social.dto.ts` — `@IsString()` → `@IsEnum(PLATAFORMA_SOCIAL_VALUES)`.
- **MOD** `backend/src/modules/places/infrastructure/dto/create-place.dto.ts` — prop `usuarioId` removida.
- **MOD** `backend/src/modules/places/infrastructure/dto/update-place.dto.ts` — revisar si `usuarioId` estaba presente (creemos que no); remover si está.

**No se tocan** `places.service.ts`, `places.controller.ts`, `place-firestore.adapter.ts`. El stub `"anonymous"` queda (deuda 2.3).

### 3.3 Umbrales SOLID

| Métrica | Umbral | Cambio en este change |
|---|---|---|
| `max-lines` por archivo backend | ≤ 300 | `red-social.dto.ts`: ~15 líneas. `plataforma-social.enum.ts`: ~15 líneas. Verde desde el inicio. |
| Cyclomatic complexity | ≤ 10 | `isValidRedSocial` añade un `if` (complejidad +1, sigue ≤ 10). |
| `max-params` | ≤ 3 | Sin cambios en firmas. |
| DIP (sin imports de infra en `domain/`) | 0 violaciones | `plataforma-social.enum.ts` y `rol.enum.ts` son puro TS. `red-social.vo.ts` no añade imports framework. |

`make solid-lint` + `bash check-refs.sh` deben quedar verdes tras el cambio.

## 4. Frontend — sin UI changes

Sin cambios de UI. Los tipos frontend (`places.types.ts`, `eventos.types.ts`) se actualizan en el change futuro `auth + usuarios` cuando se introduzcan tipos de roles y环境下 auth. Este change NO toca frontend salvo:

- Si `frontend/.../places.service.spec.ts` enviaba `usuarioId` en algún test fixture → remover (Task 5).
- Si `places.json` seed tenía `plataforma: "twitter"` → migrar (Task 6). Esperado: cero.

## 5. Trade-offs importantes

### 5.1 Renombrar sin migración de datos — viabilizado por ausencia de datos

El rename `empresa → owner` y `usuario → member` es **schema-only** porque la colección `usuarios` está vacía. Si tuviera datos en producción, requeriría script de migración + ventana de downtime (o read de old+new). La oportunidad de hacerlo **ahora** (antes de `auth`) ahorra ese costo.

**Trade-off**: si `auth + usuarios` se cancela o se posterga indefinidamente, el rename queda como cosmético que no impacta runtime. Es un costo aceptable — los enums en specs sí son consumidos por generadores de código OpenAPI y por documentación.

### 5.2 `x-twitter` —closing del enum con valor ya "obsoleto-en-potencia"

`x-twitter` es el nombre actual (desde 2023). Si la plataforma se renombra otra vez ( improbable), el enum caducaría. Compromiso: cerrar con valor actual + aceptar migración futura como otro change.

Alternativa considerada: mantener `twitter` y postergar la migración. Descartada por mentir al spec sobre el mundo real.

### 5.3 No implementar `auth` aquí — Non-Goal explícito

`auth` (Firebase JWT verify, `RolesGuard`, `/auth/login`) es **Non-Goal**. Razones:
- Scope: `auth` es un change entero con sus propios escenarios (login, refresh, logout, rol assignment al registro, `RolesGuard` reusable).
- Dependencias: `auth` requiere `usuarios` implementado (lookup de rol por UID), que requiere su propio módulo.
- Secuencia roadmap: `base-standards.md §8.4` lista `auth` como siguiente MVP, después de `roles-rename` como preparación contractual.

Este change **prepara el terreno** (renombra el enum, cierra vectores de spoofing, documenta la deuda), `auth + usuarios` **cierra la deuda**.

### 5.4 `favoritos` deferred a `auth + usuarios` — no a un change aparte

Originalmente se consideró un change `favoritos-model` separado. Descartado: la shape de almacenamiento (array en `usuarios` vs subcolección vs colección top-level) depende de patrones de acceso que solo se clarifican al diseñar `auth + usuarios` (queries frecuentes: "favoritos de este usuario" vs "qué usuarios guardaron este place"). Deferirlo a ese change, no a un tercero, mantiene la decisión con el contexto correcto.

### 5.5 Cerrar `RedSocial.plataforma` puede parecer restrictivo

El stakeholder podría querer añadir `whatsapp` o `threads` pronto. Cerrar el enum ahora requiere un change posterior para añadir. Pero:

- Es aditivo, no breaking (añadir valores a un enum no rompe clientes existentes).
- `lucide-angular` no tiene icono estándar para `whatsapp` (deben usar `MessageCircle` o similar), así que añadirlo requiere también decisión frontend. El enum cerrado fuerza esa conversación explícita vs permitirla silenciosamente.
- Los 4 enums cerrados precedentess (`ServicioEnum` etc.) han funcionado bien sin queja de restrictividad.

### 5.6 No tocar `eventos.controller.ts` `x-usuario-id` header

El header provisional está documentado como deuda (sección 2.3). No se toca porque:

1. Reemplazarlo requiere `auth` (Firebase JWT verify, no un header seteable por cliente).
2. Mover el código hoy a "leer el header con validación de formato" es trabajo wasted — se va a tirar en `auth + usuarios`.
3. El header es un stub explícito, no un patrón pretendidamente seguro.

## 6. Strategy de tests

| Capa | Tests | Cobertura objetivo |
|---|---|---|
| `plataforma-social.enum.ts` | `rol.enum.spec.ts`-style: valida 6 valores, `PLATAFORMA_SOCIAL_VALUES` longitud 6 | 100% del archivo |
| `red-social.vo.ts` | Extender `place.vo.spec.ts` (block RedSocial): rechaza `whatsapp`, `twitter`; acepta los 6 válidos | ≥ 95% statements |
| `red-social.dto.ts` | `create-place.dto.spec.ts` existente: tests que mandaban `plataforma: 'a'/'b'/'c'/'d'` ahora deben fallar; reemplazar por valores válidos del enum | 100% del archivo modificado |
| `create-place.dto.ts` | Test nuevo: body con `usuarioId` → `400` (forbidNonWhitelisted) | 100% del archivo modificado |
| Regresión `places` | Suite actual de `places` (lugar entity, service, controller, adapter) pasa sin modificaciones | Sin regresión |
| Regresión `eventos` | Suite actual de `eventos` pasa sin modificaciones (nada en eventos se toca en código) | Sin regresión |
| Regresión `solicitudes` | Suite actual pasa sin modificaciones | Sin regresión |
| Cobertura global backend | ≥ 90% en módulos `places` afectados | `make test` |
| Cobertura frontend | Sin cambios; sin regresiones | `npm test` |

**TDD estricto**: cada archivo nuevo o modificado se testa primero rojo, luego implementación.

## 7. SDD — documentos source-of-truth (actualizar ANTES del código)

Orden obligatorio (Task 1 primero):

1. `docs/data-model.md` — enum `rol` renombrado, VO `RedSocial` con enum, bloques "Authentication debt" y "Favoritos (deferred)", semántica por rol, regla `revisadoPor=rol admin`, aclaración `eventos.usuarioId` vs `placeId`.
2. `docs/api-spec.yml` — `RedSocial.plataforma` enum cerrado (`twitter → x-twitter`); `CreatePlace.usuarioId` removido.
3. `docs/base-standards.md §8.2` — tabla de personas actualizada con `owner` (Publicador) + `member` (Member registrado) + línea separada `Visitante anónimo (sin login)`.
4. `backend/README.md`, `.github/copilot-instructions.md`, `.github/instructions/{database,frontend}-instructions.md` — renombrar enum refs de `empresa`/`usuario` → `owner`/`member`.
5. Recién entonces código backend (Tasks 2-6).

`openspec validate roles-rename` corre tras Task 1 y se mantiene verde hasta Task 8.

## 8. Non-Goals (este change)

- **NO** implements `AuthModule` (Firebase JWT verify, `/auth/login`, `RolesGuard` runtime). Vive en `auth + usuarios`.
- **NO** creates `UsuariosModule` (entity, repository, service, controller, DTOs). Vive en `auth + usuarios`.
- **NO** models `usuarios.favoritos` (campo o colección). Deferred a `auth + usäterarios`.
- **NO** touches `eventos.controller.ts` `x-usuario-id` header(provisional auth). Vive en `auth + usuarios`.
- **NO** touches `places.controller.ts:44-46` `"anonymous"` stub. Vive en `auth + usuarios`.
- **NO** enforces `solicitudes.revisadoPor` rol `admin` en runtime. Vive en `auth + usuarios` (`RolesGuard`).
- **NO** añade endpoints REST. Sin rutas nuevas.
- **NO** añade UI Angular. Sin pantallas, sin componentes.
- **NO** añade índices Firestore. Sin cambios en `firestore.indexes.json`.
- **NO** añade dependencias npm. `class-validator` ya está presente.
- **NO** hace migración de datos Firestore (la colección `usuarios` está vacía). Sí audita seeds `twitter` → `x-twitter` en JSON (esperado: cero casos).
- **NO** refactoriza `places.entity.ts` ni `evento.entity.ts` (solo DTO/VO de RedSocial en `places`).
