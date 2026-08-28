# Data Model — Directorio de Empresas de Concón

> Fuente canónica del dominio (sincronizada con OpenSpec). Backend: Firebase Firestore.
> Referencia detallada de índices y reglas en `.github/instructions/database-instructions.md`.

## Entidades (colecciones Firestore)

### places
> **Modelo refactorizado por el change `places-refactor` (CH-03).** Los campos `status`, `verificado` y `fechaVerificacion` fueron eliminados y reemplazados por `activo` + `estadoVerificacion`. La solicitud auto-creada en `POST /places` fue eliminada; el place es visible públicamente inmediatamente tras la creación.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK auto) | ID de documento Firestore |
| nombre | string | Nombre del lugar (2..100 chars) |
| slug | string UNIQUE | Slug URL-friendly |
| descripcionCorta | string | Resumen breve para tarjetas (1..140 chars) |
| descripcion | string | Descripción detallada (10..2000 chars) |
| categoriaId | string (ref) | Referencia a categorías |
| subcategoriaId | string? | Referencia a `categorias.subcategorias[].slug` de la categoría seleccionada |
| barrioId | string (ref) | Referencia a barrios |
| direccion | string | Dirección física (1..200 chars) |
| coordenadas | Coordenadas | `{ lat: number; lng: number }` (lat -90..90, lng -180..180) |
| telefono | string? | Teléfono (formato CL) |
| whatsapp | string? | WhatsApp (formato CL) |
| email | string? | Email contacto |
| sitioWeb | string? | URL sitio web |
| redesSociales | RedSocial[]? | Máx 3 |
| imagenes | Imagenes | `{ logo?: string; portada?: string; galeria: string[] }` |
| planId | enum | `gratuito` \| `premium` |
| horarios | HorarioDia[]? | Array de 7 días con turnos múltiples |
| horariosEspeciales | HorarioEspecial[]? | Fechas especiales con turnos |
| abierto24x7 | boolean | Si true, ignora horarios/horariosEspeciales |
| servicios | ServicioEnum[]? | Enum controlado (wifi, estacionamiento, acceso-discapacidad, apto-mascotas, delivery, take-away, terraza, vista-al-mar, reservas, ninos-bienvenida) |
| metodosPago | MetodoPagoEnum[]? | Enum controlado (efectivo, debito, credito, transferencia, qr) |
| idiomas | string[]? | Post-MVP placeholder |
| activo | boolean | Soft-delete flag (default `true`). Cuando `false`, el place oculto del directorio público. Admin puede toggle. |
| estadoVerificacion | enum | `pendiente` \| `verificado` \| `rechazado` — default `pendiente` en creación. Seteado por admin via `POST /places/:id/verificar`. |
| motivoRechazoVerificacion | string? | Motivo del rechazo. **REQUERIDO** cuando `estadoVerificacion === 'rechazado'`. |
| gestionadoPorAdmin | boolean | `true` si el place fue creado por un admin (no via owner self-service). Default `false`. |
| destacado | boolean | Destacado en home |
| vistasTotales | number | Post-MVP placeholder, default 0 |
| valoracionGoogle | ValoracionGoogle? | Post-MVP placeholder `{ rating, reviewsCount, mapsLink }` |
| usuarioId | string | Propietario (Firebase Auth UID) — **REQUIRED** (era optional antes de CH-03). Se setea desde el verified JWT del caller al `POST /places`. No se acepta en el body del create (forbidNonWhitelisted). |
| fechaPublicacion | Timestamp? | Cuándo pasó a verificado (reemplaza `fechaVerificacion` eliminado). Se setea cuando `estadoVerificacion` pasa a `'verificado'`. |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

> **Campos eliminados por `places-refactor` (CH-03):**
> - `status: "pendiente" | "aprobado" | "rechazado"` → reemplazado por `activo` + `estadoVerificacion`.
> - `verificado: boolean` → subsumido en `estadoVerificacion`.
> - `fechaVerificacion: Timestamp?` → renombrado a `fechaPublicacion`.
>
> **Nuevo modelo de vida:** el place se crea con `activo: true` y `estadoVerificacion: 'pendiente'`. Es visible en el directorio público inmediatamente (sin badge "Verificado"). El admin verifica (`POST /places/:id/verificar`) para asignar `estadoVerificacion: 'verificado'` (badge verde) o `'rechazado'` (place desactivado).

**Value Objects (tipos anidados):**

- `RedSocial = { plataforma: PlataformaSocialEnum; url: string }` — **enum cerrado** (ver `PlataformaSocialEnum` abajo)
- `Imagenes = { logo?: string; portada?: string; galeria: string[] }`
- `HorarioDia = { dia: DiaSemana; abierto: boolean; turnos: Turno[] }`
- `Turno = { apertura: 'HH:mm'; cierre: 'HH:mm' }` (apertura < cierre)
- `HorarioEspecial = { fecha: 'YYYY-MM-DD'; descripcion: string; turnos: Turno[] }`
- `DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'`
- `ServicioEnum = 'wifi' | 'estacionamiento' | 'acceso-discapacidad' | 'apto-mascotas' | 'delivery' | 'take-away' | 'terraza' | 'vista-al-mar' | 'reservas' | 'ninos-bienvenida'`
- `MetodoPagoEnum = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'qr'`
- `PlataformaSocialEnum = 'instagram' | 'facebook' | 'x-twitter' | 'linkedin' | 'tiktok' | 'youtube'` — enum cerrado; reemplaza al `plataforma: string` libre. Coherente con `ServicioEnum`, `MetodoPagoEnum`, etc. y con `docs/api-spec.yml` + iconografía `lucide-angular`.
- `ValoracionGoogle = { rating: number; reviewsCount: number; mapsLink: string }`

> **Migración `twitter` → `x-twitter`:** el valor legacy `'twitter'` (renamed de plataforma en julio 2023) deja de ser válido. Cualquier documento `places` en Firestore staging con `redesSociales[].plataforma === 'twitter'` debe migrarse manualmente a `'x-twitter'`. **Auditado en la Task 6 del change `roles-rename`:** no existen seeds/fixtures locales con valores legacy en el repo (el directorio `frontend/src/app/shared/data-access/local/data/` solo contiene `barrios.json` y `categorias.json`, ninguno con `redesSociales`; el módulo `eventos` no modela `redesSociales`; no hay scripts `backend/scripts/` con seeds TS/JS). El único punto de posible migración es Firestore staging, que se audita manualmente en deploy.

### categorias
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | Firestore document id (slug, ej. `gastronomia`, `comercio`) |
| nombre | string | Ej. "Gastronomía" |
| slug | string UNIQUE | Slug |
| descripcion | string? | Descripción (opcional) |
| icono | string | Icono Lucide kebab-case (`utensils`, `store`, `tent`, `briefcase`, `car`, `heart-pulse`, `graduation-cap`, `building-2`, `party-popper`) |
| color | string? | Hex (opcional) |
| orden | number | Orden visual (1..99) |
| activo | boolean | Activa (default `true`) |
| subcategorias | Subcategoria[]? | Array de `{ slug, nombre, activo }` — embebidas en el doc de la categoría; cada una con `activo: boolean` |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

> **Fuentes canónicas:** `categorias.json` en `frontend/src/app/shared/data-access/local/data/` (JSON canónico del frontend) + colección Firestore poblada por `npm run seed` (`set(merge:true)` keyed by slug, `activo: true`). El seed materializa subcategorías con `activo: true` y normaliza slugs a ASCII (`/^[a-z0-9-]+$/`).

### barrios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | Firestore document id (slug, ej. `higuerillas`, `montemar`, `zona-rural`) |
| nombre | string | Ej. "Higuerillas" |
| slug | string UNIQUE | Slug |
| codigo | string? | Código UV (opcional) |
| descripcion | string? | Descripción (opcional) |
| territorio | string? | Sectores que abarca el barrio (metadato, opcional) |
| coordenadas | {lat, lng}? | Centro del barrio (opcional) |
| tipo | enum | `urbano` \| `rural` (12 urbanos + 1 rural `zona-rural`) |
| activo | boolean | Activo (default `true`) |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

> **Fuentes canónicas:** `barrios.json` en `frontend/src/app/shared/data-access/local/data/` (JSON canónico del frontend) + colección Firestore poblada por `npm run seed` (`set(merge:true)` keyed by slug, `activo: true`).

### usuarios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (UID Auth) | UID Firebase Auth |
| email | string UNIQUE | Email |
| nombre | string | Nombre |
| rol | enum | `admin` \| `owner` \| `member` |
| telefono | string? | Teléfono |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

> **Nota — Eliminación de `usuarios.placeId` (change `auth-usuarios-v2`):** el campo `placeId` que existió entre los changes `auth-usuarios` y `auth-usuarios-v2` fue **eliminado**. Duplicaba la relación ya almacenada en `places.usuarioId` (fuente única de verdad) e imponía una invariante incompatible con el self-registration (un `owner` recién registrado existe antes de tener place). La relación usuario→place se resuelve con una query `places` `WHERE usuarioId == uid` (índice simple). La cardinalidad "1 owner : N places" queda libre; si el negocio decide restringirla a 1:1, la regla se enforceará en `PlacesService` (count query) en el change `places-refactor` (CH-03), no en el documento del usuario.

**Semántica por rol:**

- `admin` — acceso total: aprueba/rechaza `solicitudes`, gestiona `categorias`/`barrios`, edita cualquier place/evento, toggles `destacado`/`verificado`. Se provisiona via el script `seed-admin.ts` (no via API pública ni via `POST /usuarios`, endpoint eliminado).
- `owner` — gestiona su `places` (relación via `places.usuarioId`, no via un campo en `usuarios`); crea eventos con `eventos.usuarioId === token.uid`; no puede administrar catálogos ni aprobar solicitudes. Reemplaza al rol legacy `empresa`. Se obtiene via self-registration (`POST /auth/registro` con `rol: 'owner'`).
- `member` — perfil básico autenticado; acceso de lectura pública completo; capacidad (futura, deferred — ver "Favoritos (deferred)") de guardar `places` favoritos; NO puede `POST /places` ni `POST /eventos` (403). Reemplaza al rol legacy `usuario`.

> **Nota — Rename del enum (rol):** el enum cambió de `'admin' | 'empresa' | 'usuario'` a `'admin' | 'owner' | 'member'` (English-only, function-based naming, "Family B"). El rename es schema-only: la colección `usuarios` estaba vacía al momento del change `roles-rename` (el módulo `usuarios` no estaba implementado), por lo que **no hubo migración de datos**. Tras el change `auth-usuarios` (módulo ensamblado) y `auth-usuarios-v2` (self-registration público), los registros nuevos llegan via `POST /auth/registro` con `rol ∈ {member, owner}`; el primer `admin` se provisiona via el script `seed-admin.ts` (no via API). El provisioning admin (`POST /usuarios`) fue eliminado en `auth-usuarios-v2`.

> **Authentication debt — [CLOSED por el change `auth-usuarios`, se materializa al archivar dicho change]:**
>
> El change `roles-rename` documentó tres divergencias runtime entre el modelo canónico y la implementación de los módulos existentes. El change `auth-usuarios` cierra las tres divergencias (sus tasks 10, 11, 12 introducen la enforcement runtime; el dato de auditoría a continuación preserva la historia):
>
> 1. **[CLOSED]** `places.usuarioId` persistía como el literal string `"anonymous"` (stub en `backend/src/modules/places/infrastructure/places.controller.ts:44-46`), sin importar quién llamaba `POST /places`. En el change `auth-usuarios`, el controlador adopta `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner')` y reemplaza el stub por `usuarioId = user.uid` proveniente delverified Firebase Auth JWT.
> 2. **[CLOSED]** `eventos.usuarioId` se obtenía del header HTTP provisional `x-usuario-id` (referencias históricas: `backend/src/modules/eventos/infrastructure/eventos.controller.ts:50,132,156`), no de un Firebase Auth JWT verificado. En el change `auth-usuarios`, el controlador elimina los headers `x-usuario-id` / `x-rol` y reemplaza el sourcing del `usuarioId` por `@CurrentUser() user: AuthContext` (`user.uid` verificado). El header provisional se elimina sin breaking-vivo (no existe frontend en producción).
> 3. **[CLOSED]** `solicitudes.revisadoPor` se escribía sin validación runtime del `rol === 'admin'` (el `UsuariosModule` no existía, los Guards no estaban cableados, y además el `SolicitudesModule` no exponía un HTTP controller de approve/reject). En el change `auth-usuarios` se introduce el `SolicitudesController` con los endpoints `POST /solicitudes/:id/approve|reject` decorados con `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`, seteando `revisadoPor` desde `user.uid` con el `rol === 'admin'` garantizado por el `RolesGuard`.
>
> El bloque de deuda del change `roles-rename` solo **documentaba**; el cambio `auth-usuarios` **cierra** las tres. La brecha lateral del change previo (remover `usuarioId` del body de `CreatePlace` para evitar vector de spoofing) queda como base de contrato, y ahora el runtime efectivamente usa el UID provisto por JWT.

> **Favoritos (deferred — sigue fuera del change `auth-usuarios`):** el campo `favoritos` (places guardados por rol `member`) se modelará en un change futuro `favoritos-crud` (no en `auth-usuarios` ni en `roles-rename`). Las tres formas de almacenamiento bajo consideración son: (a) `usuarios.favoritos: string[]` (array de `placeId` en el doc), (b) subcolección `usuarios/{uid}/favoritos/{placeId}`, (c) colección top-level `favoritos` con docs `{usuarioId, placeId, createdAt}`. La shape se decidirá contra patrones de acceso reales (queries "favoritos de este usuario" vs "qué usuarios guardaron este place").

### solicitudes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | ID documento |
| placeId | string? (ref) | Place asociado (nullable para solicitudes de eventos; XOR con `eventoId`) |
| eventoId | string? (ref) | Evento asociado (nullable para solicitudes de places; XOR con `placeId`) |
| usuarioId | string (ref) | Usuario creador |
| tipo | enum | `registro` \| `actualizacion` \| `registro-evento` \| `actualizacion-evento` \| `reclamo-place` |
| status | enum | `pendiente` \| `aprobado` \| `rechazado` |
| proposal | object? | Staging de updates para `tipo: 'actualizacion-evento'` (JSON con los campos a aplicar al aprobar). Null para los demás `tipo`. |
| solicitanteUid | string? | UID del caller que reclama el place. **REQUERIDO** cuando `tipo === 'reclamo-place'`. |
| comentarios | string? | Comentarios |
| revisadoPor | string? | UID del admin que aprobó/rechazó. MUST resolver a un `usuarios.id` con `rol === 'admin'`. Tras el change `auth-usuarios`, la validación runtime está garantizada por el `RolesGuard` con `@Roles('admin')` en los endpoints `POST /solicitudes/:id/approve|reject` del nuevo `SolicitudesController` (ver "Authentication debt — [CLOSED]" en §usuarios). |
| createdAt | Timestamp | Creación |
| revisadoAt | Timestamp? | Revisión |

> **Nota (módulo places — cambio por `places-refactor`):** la solicitud auto-creada al crear un place fue **eliminada**. El place se crea con `activo: true` y es visible públicamente inmediatamente. La verificación del owner se hace vía `POST /places/:id/reclamar` (crea solicitud `reclamo-place`), y la verificación admin vía `POST /places/:id/verificar`.
>
> **Nota (módulo eventos — cambio por `eventos-refactor`):** la auto-creación de solicitudes al crear/actualizar eventos fue **eliminada**. El evento se crea con `activo: true` y `estadoVerificacion: 'pendiente'`, y es visible públicamente inmediatamente. El owner edita su evento en cualquier momento (edición in-place); si el evento estaba `verificado`, la edición lo revierte a `pendiente` (mismo write) y registra el diff en `cambios[]`. La verificación admin se hace vía `POST /eventos/:id/verificar` (sin generar `solicitudes` — el tipo `registro-evento`/`actualizacion-evento` quedó deprecado; su eliminación física ocurre en el change `solicitudes-refactor`).
>
> **Constraint XOR (solicitudes):** una `solicitud` referencia `placeId` **O** `eventoId`, nunca ambos (validado en `SolicitudesService`). Los tipos `registro-evento`/`actualizacion-evento` (que usaban `eventoId`) quedan deprecated y ya no se crean desde `eventos`; `eventoId` se mantiene solo para lectura de documentos legacy hasta CH-05.

### eventos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK auto) | ID de documento Firestore |
| nombre | string | Nombre del evento (2..120 chars) |
| slug | string UNIQUE | Slug URL-friendly derivado del `nombre` |
| descripcionCorta | string | Resumen breve para tarjetas (1..140 chars) |
| descripcion | string | Descripción detallada (10..2000 chars) |
| categoriaId | string (constante) | Siempre `'eventos'` (seteado por sistema, no en DTO) |
| subcategoriaId | string (ref) | Referencia a `categorias.subcategorias[].slug` de la categoría `eventos` (uno de los 10 slugs sembrados) |
| barrioId | string (ref) | Referencia a `barrios` |
| organizador | string | Nombre organizador (1..200 chars) |
| organizadorContacto | string? | Teléfono o email de contacto |
| organizadorWeb | string? | URL web/red social del organizador |
| ubicacion | Ubicacion VO? | Venue del evento. **Requerido** cuando `modalidad !== 'online'`; `undefined` cuando `modalidad === 'online'`. Forma: `{ nombreLugar?: string; direccion?: string; coordenadas: Coordenadas }` (reemplaza los campos planos `ubicacionNombre`/`ubicacionDireccion`/`coordenadas`; reuso del VO `Coordenadas` de `places`). Solo `coordenadas` es obligatoria; `direccion` es opcional (puede resolverse por coincidencia con un `place`). |
| modalidad | enum | `'presencial' | 'online' | 'hibrido'` — forma de realización del evento. **Requerido en create** (sin default de sistema). `online` NO lleva `ubicacion`; `presencial`/`hibrido` requieren `ubicacion` con `coordenadas`. No hay FK a `places` (el vínculo se resuelve por coincidencia de coordenadas/dirección). Legacy docs sin `modalidad` se hidratan como `'presencial'`. |
| fechaInicio | Timestamp | Fecha/hora de inicio (ISO 8601) |
| fechaFin | Timestamp | Fecha/hora de término (ISO 8601); **debe ser > `fechaInicio`** |
| precioTipo | enum | `gratis` \| `pago` \| `donacion` \| `invitacion` |
| precioValor | number | Valor de entrada (`0` si `precioTipo='gratis'`; `> 0` en caso contrario) |
| precioMoneda | enum | `CLP` \| `USD` (default `CLP`) |
| capacidadMaxima | number? | Aforo máximo (> 0) |
| publicoObjetivo | PublicoObjetivoEnum[] | ≥ 1 elemento; `familia` \| `adultos` \| `tercera_edad` \| `mascotas` \| `todos` \| `ninos` \| `adolescentes` |
| nivelRuido | enum | `bajo` \| `medio` \| `alto` |
| portada | string? | URL imagen portada (16:9 recomendado) |
| accesibilidad | AccesibilidadEnum[]? | `acceso-silla-ruedas` \| `banos-accesibles` \| `estacionamiento-reservado` \| `interprete-señas` \| `material-braille` \| `rampa-acceso` |
| activo | boolean | Visible públicamente cuando `activo === true` (default `true`); reemplaza el legacy `status`. Un evento inactivo es invisible en descubrimiento público sin importar `estadoVerificacion`. |
| estadoVerificacion | enum | `pendiente` \| `verificado` \| `rechazado` (default `pendiente`); rige el badge "Verificado". Reemplaza el legacy `verificado: boolean`. |
| motivoRechazoVerificacion | string? | Requerido cuando `estadoVerificacion === 'rechazado'`; razón registrada por el admin. |
| cambios | CambioEvento[]? | Historial de auditoría; cada entrada `{ campo: string; valorAnterior: unknown; valorNuevo: unknown; fecha: Timestamp; usuarioId: string }`. Se popula en cada `PUT /eventos/:id` (y explícitamente al revertir un evento verificado a `pendiente`). |
| estado | enum | `borrador` \| `programado` \| `en_curso` \| `finalizado` \| `cancelado` \| `suspendido` (ciclo de vida del evento) |
| destacado | boolean | Destacado en home/listados (default `false`) |
| usuarioId | string | Firebase Auth UID del creador (REQUIRED, seteado desde token verificado; no en DTO). Identifica al **responsable de publicación** del evento. |
| vistasTotales | number | Post-MVP placeholder, default 0 (sin lógica de incremento en este cambio, mirror de `places`) |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |
| fechaPublicacion | Timestamp? | Seteado cuando `estadoVerificacion` pasa a `'verificado'` (espejo de `places.fechaPublicacion`) |

**Value Objects y enums nuevos:**

- `PrecioTipo = 'gratis' | 'pago' | 'donacion' | 'invitacion'`
- `PrecioMoneda = 'CLP' | 'USD'`
- `PublicoObjetivoEnum = 'familia' | 'adultos' | 'tercera_edad' | 'mascotas' | 'todos' | 'ninos' | 'adolescentes'`
- `AccesibilidadEnum = 'acceso-silla-ruedas' | 'banos-accesibles' | 'estacionamiento-reservado' | 'interprete-señas' | 'material-braille' | 'rampa-acceso'`
- `NivelRuido = 'bajo' | 'medio' | 'alto'`
- `EventoEstado = 'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido'`
- `EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado'` (compartido con `places`)
- `Ubicacion = { nombreLugar?: string; direccion?: string; coordenadas: Coordenadas }`
- `CambioEvento = { campo: string; valorAnterior: unknown; valorNuevo: unknown; fecha: Timestamp; usuarioId: string }`
- `Coordenadas` — reusar el VO ya definido en `places`: `{ lat: number; lng: number }`

> **Nota (ciclo de vida del evento):** `estadoVerificacion` rige el badge "Verificado" (admin lo asigna vía `POST /eventos/:id/verificar`). `estado` rige el ciclo de vida del evento (seteable por publisher/admin). En esta versión las transiciones automáticas `programado`→`en_curso`→`finalizado` basadas en `fechaInicio`/`fechaFin` **no se implementan** (Non-Goal post-MVP).

## Reglas de negocio del dominio

### Reglas comunes (places + eventos)

- Un place pertenece a una categoría y un barrio (`categoriaId`, `barrioId` obligatorios).
- `subcategoriaId` es opcional y debe referenciar un slug existente en `categorias.subcategorias[].slug` de la `categoriaId` seleccionada.
- `slug` de place/categoria/barrio debe ser único (verificar antes de crear).
- Solo rol `admin` aprueba/rechaza solicitudes y edita places ajenos.
- Rol `owner` solo gestiona su propio place (`places.usuarioId === token.uid`) y crea eventos (`eventos.usuarioId === token.uid`).
- Rol `member` NO puede `POST /places` ni `POST /eventos` (403).
- Registro de usuarios: rol default `'member'` (cuando el módulo `auth + usuarios` aterrice).

### Reglas específicas de places (change `places-refactor`)

- Todo place nuevo se crea con `activo: true` y `estadoVerificacion: 'pendiente'`. Es visible en el directorio público inmediatamente, **sin badge de verificación**.
- El place es visible públicamente cuando `activo === true` (sin filtro de `estadoVerificacion` — places pendientes y rechazados se muestran, pero los rechazados tienen `activo: false`).
- **Soft-delete**: `DELETE /places/:id` setea `activo: false` (no hard-delete). Retorna `409` si existen `solicitudes` pendientes de tipo `reclamo-place` asociadas al place.
- **Claiming (owner)**: `POST /places/:id/reclamar` (rol `owner`) crea una `solicitud` de tipo `reclamo-place` con `solicitanteUid = token.uid`. Solo se permite si el place no tiene un owner activo (`usuarioId == null` O `gestionadoPorAdmin === true`) y el caller no es `admin`.
- **Verificación (admin)**: `POST /places/:id/verificar` (rol `admin`) asigna `estadoVerificacion: 'verificado'` + `fechaPublicacion: <now>` (badge verde) O `estadoVerificacion: 'rechazado'` + `activo: false` + `motivoRechazoVerificacion: <motivo>` (requerido).
- **Claiming approval**: al aprobar una `solicitud` de tipo `reclamo-place`, se asigna `usuarioId = solicitanteUid` al place y se auto-rechazan todas las demás solicitudes `reclamo-place` pendientes para el mismo place (transacción Firestore).
- Actualizar un place existente (`PUT /places/:id`) **NO** revierte `estadoVerificacion` (a diferencia del módulo `eventos`).
- `gestionadoPorAdmin: true` indica un place creado por un admin (no vía owner self-service). Los places con `gestionadoPorAdmin: true` son candidatos a ser reclamados vía `sinDueno`.
- `galeria` en `imagenes`: plan gratuito máx 3 imágenes, plan premium máx 10.
- `horarios`: cada día puede tener 0..3 turnos; si `abierto: false`, `turnos` debe ser `[]`.
- `horariosEspeciales` sobrescribe `horarios` para la fecha indicada; `turnos: []` significa cerrado ese día.
- `abierto24x7: true` ignora `horarios` y `horariosEspeciales` (siempre abierto).
- Campos post-MVP (`idiomas`, `vistasTotales`, `valoracionGoogle` en places) se persisten como placeholders; no hay lógica de sincronía ni incremento en este cambio.
- Paginación por cursor Firestore (no offset). Índices compuestos requeridos.

### Responsabilidad del evento (places + eventos)

- El "responsable de publicación" del evento es `eventos.usuarioId` (quien lo crea/publica, autenticado via token).
- El lugar del evento se declara en `eventos.ubicacion` (objeto con `nombreLugar`, `direccion` y `coordenadas`), independiente de cualquier `places`. El campo legacy `eventos.placeId` fue eliminado en `eventos-refactor` porque acoplaba innecesariamente el evento a un place del directorio.
- Cualquiera sea el caso, **el responsable sigue siendo `eventos.usuarioId`**; `ubicacion` representa el *lugar* del evento, no el *autor*.

### Reglas RBAC (solicitudes.revisadoPor)

- La regla "solo `admin` puede mutar `solicitudes.status` a `'aprobado'`/`'rechazado'`" se documenta en línea con el campo `solicitudes.revisadoPor` (ver §solicitudes arriba) para mantener la fuente canónica adyacente al schema. Este bloque de §Reglas comunes existe como referencia transversal.
- Tras el change `auth-usuarios`, la regla **se valida en runtime** vía el `SolicitudesController` (nuevo en ese change) con `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` sobre los endpoints `POST /solicitudes/:id/approve|reject`. Antes del change `auth-usuarios`, la regla solo se documentaba (ver "Authentication debt — [CLOSED]" en §usuarios).


### Reglas específicas de eventos

- Un evento **siempre** tiene `categoriaId: 'eventos'` (constante, seteada por sistema; no se acepta en el DTO de create/update — forbidNonWhitelisted).
- `subcategoriaId` (evento) es **obligatorio** y debe ser uno de los 10 slugs sembrados para la categoría `eventos`: `festivales-culturales`, `ferias-gastronomicas`, `ferias-libres`, `deportes-y-competencias`, `conciertos-y-shows`, `talleres-y-clases-abiertas`, `eventos-familiares`, `temporada-de-verano`, `fiestas-patrias`, `mercados-sustentables`.
- `barrioId` (evento) referencia un `barrios` existente (validado antes de persistir).
- `fechaFin` debe ser estrictamente mayor que `fechaInicio`.
- `precioTipo='gratis'` ⟹ `precioValor === 0`. `precioTipo !== 'gratis'` ⟹ `precioValor > 0`.
- `publicoObjetivo` debe contener al menos un elemento del enum controlado.
- `placeId` (si presente) debe referenciar un `places` existente con `activo: true`.
- `usuarioId` es REQUIRED; se setea desde el token Firebase Auth verificado (no se acepta en el DTO).
- Todo evento nuevo se crea con `status: 'pendiente'`, `estado: 'borrador'` y genera automáticamente una `solicitud` con `tipo: 'registro-evento'`, `status: 'pendiente'`, `eventoId` apuntando al nuevo evento.
- Editar un evento con `status: 'aprobado'` NO aplica cambios in-place: genera una `solicitud` con `tipo: 'actualizacion-evento'`, `status: 'pendiente'`, `eventoId`, `usuarioId`, `proposal` (objeto JSON con los campos staging). El evento visible al público permanece sin cambios hasta que el admin aprueba la solicitud.
- Editar un evento con `status !== 'aprobado'` (`pendiente` o `rechazado`) aplica in-place sin generar nueva `solicitud`.
- Rol `owner` solo gestiona sus propios eventos (`evento.usuarioId === uid token`); caso contrario → `403`.
- Rol `admin` gestiona cualquier evento.
- Rol `member` no puede crear ni gestionar eventos (`POST /eventos` → 403).
- Visitante anónimo solo ve eventos con `status: 'aprobado'` (en `GET /eventos`, `GET /eventos/{id}`, `GET /eventos/slug/{slug}` y `GET /eventos/map-data`). Eventos pendientes/rechazados retornan `404` por id/slug al público.
- `DELETE` retorna `409` si existen `solicitudes` pendientes asociadas (`eventoId + status='pendiente'`).
- XOR en `solicitudes`: una solicitud referencia `placeId` **O** `eventoId`, nunca ambos (validado en `SolicitudesService`).
- Aprobar una `solicitud` con `tipo: 'registro-evento'` → setea el evento asociado a `status: 'aprobado'`, `estado: 'programado'`, `fechaPublicacion: <now>`.
- Rechazar una `solicitud` con `tipo: 'registro-evento'` → setea el evento a `status: 'rechazado'` (sigue oculto al público).
- Aprobar una `solicitud` con `tipo: 'actualizacion-evento'` → aplica los campos de `proposal` al evento asociado in-place (refresca `updatedAt`).
- Rechazar una `solicitud` con `tipo: 'actualizacion-evento'` → no modifica el evento.
- Transiciones automáticas de `estado` (`programado`→`en_curso`→`finalizado` por `fechaInicio`/`fechaFin`) son Non-Goal en este cambio (post-MVP).

## Índices Firestore requeridos

> Fuente canónica: `firestore.indexes.json` (raíz del repo). Este cambio
> (`places-auth-fix`) declara los índices marcados **[+]**: se crean ANTES del
> deploy de las queries que los requieren (deploy-time requirement).
> Los índices sin marcador ya existen en `firestore.indexes.json` o son
> auto-indexed por Firestore (single-field, sin declaración compuesta).

### Auto-indexed (single-field — Firestore los crea automáticamente)

```
places: categoriaId (ASC)
places: barrioId (ASC)
places: slug (ASC) — único
categorias: slug (ASC) — único
barrios: slug (ASC) — único
categorias: activa (ASC)
barrios: tipo (ASC)
usuarios: email (ASC) — único (fieldOverride en firestore.indexes.json)
usuarios: rol (ASC) (fieldOverride en firestore.indexes.json)
```

### Composite indexes — declarados en `firestore.indexes.json`

```
# places (existentes — refactorizados por places-refactor: status → activo)
places: activo (ASC) + destacado (DESC) + createdAt (DESC)
places: activo (ASC) + categoriaId (ASC) + destacado (DESC) + createdAt (DESC)
places: activo (ASC) + barrioId (ASC) + destacado (DESC) + createdAt (DESC)
places: activo (ASC) + categoriaId (ASC) + barrioId (ASC) + destacado (DESC) + createdAt (DESC)

# places [+] — nuevos por places-refactor
places: activo (ASC) + estadoVerificacion (ASC) + createdAt (DESC) — cola admin verificación
places: activo (ASC) + gestionadoPorAdmin (ASC) + createdAt (DESC) — sinDueno
places: slug (ASC) — único (verificar unicidad)

# eventos (existentes)
eventos: categoriaId (ASC) + fechaInicio (ASC)
eventos: barrioId (ASC) + fechaInicio (ASC)
eventos: subcategoriaId (ASC) + fechaInicio (ASC)
eventos: status (ASC) + destacado (DESC) + fechaInicio (ASC)
eventos: slug (ASC) — único
eventos: usuarioId (ASC) + createdAt (DESC)
eventos: fechaInicio (ASC) + estado (ASC)

# solicitudes (existentes)
solicitudes: eventoId (ASC) + status (ASC) — pendientes por evento, `DELETE /eventos/{id}`

# solicitudes [+] — declarados por places-auth-fix
solicitudes: placeId (ASC) + status (ASC) — pendientes por place, `DELETE /places/{id}`
solicitudes: status (ASC) + createdAt (DESC) — futura cola de revisión admin

# eventos [+] — declarados por places-auth-fix
eventos: status (ASC) + estado (ASC) + fechaInicio (ASC) — público `findAllPublic`
eventos: status (ASC) + estado (ASC) + subcategoriaId (ASC) + fechaInicio (ASC)
eventos: status (ASC) + estado (ASC) + barrioId (ASC) + fechaInicio (ASC)
eventos: status (ASC) + estado (ASC) + precioTipo (ASC) + fechaInicio (ASC)
eventos: categoriaId (ASC) + createdAt (DESC) — admin `findAllAdmin`
eventos: subcategoriaId (ASC) + createdAt (DESC) — admin
eventos: barrioId (ASC) + createdAt (DESC) — admin
eventos: estado (ASC) + createdAt (DESC) — admin

# categorias/barrios (implementados — módulos backend activos)
categorias: activo (ASC) + orden (ASC)
barrios: activo (ASC) + tipo (ASC)
```

> **Nota deuda (YAGNI)**: `findAllPublic` soporta combinaciones de filtros
> (categoriaId/subcategoriaId/barrioId/precioTipo) cuyo cross-product de índices
> no se declara. Las queries multi-filtro no cubiertas por los índices anteriores
> requieren añadir su índice antes de activarlas en el frontend.

## Convenciones de nombres

- Colecciones: plural, camelCase (`places`, `categorias`).
- Documentos: ID auto o slug kebab-case.
- Campos: camelCase (`placeId`, `createdAt`, `updatedAt`).
- Timestamps: `createdAt`, `updatedAt` (Firestore Timestamp).

## Ejemplos canónicos (seed local)

> Los IDs son slugs que coinciden con los Firestore document ids. El seed local vive en `frontend/src/app/shared/data-access/local/data/`.

**Place ejemplo:**
```json
{
  "id": "restaurante-el-marino",
  "nombre": "Restaurante El Marino",
  "slug": "restaurante-el-marino",
  "descripcionCorta": "Mariscos frescos con vista al mar en Concón",
  "descripcion": "Restaurante familiar especializado en mariscos y pescados frescos. Ubicado en la costanera con terraza y vista panorámica al océano. Ideal para almuerzos y cenas en familia.",
  "categoriaId": "gastronomia",
  "subcategoriaId": "restaurantes",
  "barrioId": "higuerillas",
  "direccion": "Av. Borgoño 12345, Concón",
  "coordenadas": { "lat": -33.0123, "lng": -71.5456 },
  "telefono": "+56932123456",
  "whatsapp": "+56932123456",
  "email": "contacto@elmarino.cl",
  "sitioWeb": "https://www.elmarino.cl",
  "redesSociales": [
    { "plataforma": "instagram", "url": "https://instagram.com/elmarino" },
    { "plataforma": "facebook", "url": "https://facebook.com/elmarino" }
  ],
  "imagenes": {
    "logo": "https://storage.googleapis.com/directorio-concon/logos/restaurante-el-marino.webp",
    "portada": "https://storage.googleapis.com/directorio-concon/portadas/restaurante-el-marino.jpg",
    "galeria": [
      "https://storage.googleapis.com/directorio-concon/galeria/restaurante-el-marino_1.jpg",
      "https://storage.googleapis.com/directorio-concon/galeria/restaurante-el-marino_2.jpg"
    ]
  },
  "planId": "gratuito",
  "horarios": [
    { "dia": "lunes", "abierto": true, "turnos": [{ "apertura": "12:00", "cierre": "16:00" }, { "apertura": "19:00", "cierre": "23:00" }] },
    { "dia": "martes", "abierto": true, "turnos": [{ "apertura": "12:00", "cierre": "16:00" }, { "apertura": "19:00", "cierre": "23:00" }] },
    { "dia": "miercoles", "abierto": true, "turnos": [{ "apertura": "12:00", "cierre": "16:00" }, { "apertura": "19:00", "cierre": "23:00" }] },
    { "dia": "jueves", "abierto": true, "turnos": [{ "apertura": "12:00", "cierre": "16:00" }, { "apertura": "19:00", "cierre": "23:00" }] },
    { "dia": "viernes", "abierto": true, "turnos": [{ "apertura": "12:00", "cierre": "16:00" }, { "apertura": "19:00", "cierre": "23:30" }] },
    { "dia": "sabado", "abierto": true, "turnos": [{ "apertura": "13:00", "cierre": "16:00" }, { "apertura": "19:00", "cierre": "23:30" }] },
    { "dia": "domingo", "abierto": false, "turnos": [] }
  ],
  "horariosEspeciales": [
    { "fecha": "2025-12-31", "descripcion": "Noche de Año Nuevo", "turnos": [{ "apertura": "12:00", "cierre": "18:00" }] },
    { "fecha": "2025-09-18", "descripcion": "Fiestas Patrias", "turnos": [] }
  ],
  "abierto24x7": false,
  "servicios": ["wifi", "estacionamiento", "terraza", "vista-al-mar"],
  "metodosPago": ["efectivo", "debito", "credito", "transferencia"],
  "idiomas": ["español", "inglés"],
  "activo": true,
  "estadoVerificacion": "verificado",
  "motivoRechazoVerificacion": null,
  "gestionadoPorAdmin": false,
  "destacado": true,
  "vistasTotales": 0,
  "valoracionGoogle": null,
  "usuarioId": "firebase-auth-uid-ejemplo",
  "fechaPublicacion": "2025-01-15T12:00:00Z",
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Categoría ejemplo:**
```json
{
  "id": "gastronomia",
  "nombre": "Gastronomía",
  "descripcion": "Restaurantes, cafeterías y locales de comida",
  "icono": "utensils",
  "orden": 1,
  "activo": true,
  "subcategorias": [
    { "slug": "restaurantes", "nombre": "Restaurantes", "activo": true },
    { "slug": "cafeterias", "nombre": "Cafeterías", "activo": true }
  ]
}
```

**Barrio ejemplo:**
```json
{
  "id": "higuerillas",
  "nombre": "Higuerillas",
  "descripcion": "Zona costera al norte de Concón",
  "territorio": "Costa norte",
  "tipo": "urbano",
  "activo": true,
  "coordenadas": null
}
```