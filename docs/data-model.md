# Data Model — Directorio de Empresas de Concón

> Fuente canónica del dominio (sincronizada con OpenSpec). Backend: Firebase Firestore.
> Referencia detallada de índices y reglas en `.github/instructions/database-instructions.md`.

## Entidades (colecciones Firestore)

### places
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
| status | enum | `pendiente` \| `aprobado` \| `rechazado` |
| verificado | boolean | Verificado por admin |
| fechaVerificacion | Timestamp? | Cuándo se verificó |
| destacado | boolean | Destacado en home |
| vistasTotales | number | Post-MVP placeholder, default 0 |
| valoracionGoogle | ValoracionGoogle? | Post-MVP placeholder `{ rating, reviewsCount, mapsLink }` |
| usuarioId | string? | Propietario (Firebase Auth UID) |
| fechaPublicacion | Timestamp? | Cuándo pasó a aprobado |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

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
| descripcion | string | Descripción |
| icono | string | Icono Lucide kebab-case (`utensils`, `store`, `tent`, `briefcase`, `car`, `heart-pulse`, `graduation-cap`, `building-2`, `party-popper`) |
| color | string? | Hex |
| orden | number | Orden visual (1..9) |
| activa | boolean | Activa |
| subcategorias | Subcategoria[]? | Array de `{ slug, nombre, descripcion }` — preservadas en seed local; futuras subcategorías del backend |
| createdAt | Timestamp | Creación |

### barrios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | Firestore document id (slug, ej. `higuerillas`, `montemar`, `zona-rural`) |
| nombre | string | Ej. "Higuerillas" |
| slug | string UNIQUE | Slug |
| codigo | string? | Código UV |
| descripcion | string | Descripción (sin tilde en seed local) |
| territorio | string? | Sectores que abarca el barrio (metadato) |
| coordenadas | {lat, lng}? | Centro del barrio |
| tipo | enum | `urbano` \| `rural` (12 urbanos + 1 rural `zona-rural`) |
| createdAt | Timestamp | Creación |

### usuarios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (UID Auth) | UID Firebase Auth |
| email | string UNIQUE | Email |
| nombre | string | Nombre |
| rol | enum | `admin` \| `owner` \| `member` |
| placeId | string? | Si es dueño de un place (solo rol `owner`; null para `admin` y `member`) |
| telefono | string? | Teléfono |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

**Semántica por rol:**

- `admin` — acceso total: aprueba/rechaza `solicitudes`, gestiona `categorias`/`barrios`, edita cualquier place/evento, toggles `destacado`/`verificado`.
- `owner` — gestiona su `places` (vinculado via `placeId`); crea eventos con `eventos.usuarioId === token.uid`; no puede administrar catálogos ni aprobar solicitudes. Reemplaza al rol legacy `empresa`.
- `member` — perfil básico autenticado; acceso de lectura pública completo; capacidad (futura, deferred — ver "Favoritos (deferred)") de guardar `places` favoritos; NO puede `POST /places` ni `POST /eventos` (403). Reemplaza al rol legacy `usuario`.

> **Nota — Rename del enum (rol):** el enum cambió de `'admin' | 'empresa' | 'usuario'` a `'admin' | 'owner' | 'member'` (English-only, function-based naming, "Family B"). El rename es schema-only: la colección `usuarios` está vacía (el módulo `usuarios` no está implementado), por lo que **no hay migración de datos**. Cuando el change MVP `auth + usuarios` aterrice, los registros nuevos empiezan con los valores nuevos directamente.

> **Authentication debt (documentada, NO accionada en este change — la cierra el futuro `auth + usuarios`):**
>
> 1. `places.usuarioId` hoy persiste como el literal string `"anonymous"` (stub en `backend/src/modules/places/infrastructure/places.controller.ts:44-46`), sin importar quién llama `POST /places`. El modelo afirma que este campo es el UID del propietario; el runtime reaches parity cuando `auth + usuarios` aterrice.
> 2. `eventos.usuarioId` hoy se obtiene del header HTTP provisional `x-usuario-id` (ver `backend/src/modules/eventos/infrastructure/eventos.controller.ts:50,132,156`), no de un Firebase Auth JWT verificado. Hay un endpoint `x-usuario-id` provisor encargado de la autoría temporal; no es un boundary de seguridad — el runtime reaches parity cuando `auth + usuarios` aterrice.
> 3. `solicitudes.revisadoPor` se escribe sin validación runtime del `rol === 'admin'` (el `UsuariosModule` no existe, los Guards no están cableados). El modelo afirma que este campo MUST resolver a un `usuarios` con rol `admin`; el runtime reaches parity cuando `auth + usuarios` aterrice.
>
> Este bloque de deuda solo **documenta**; el cambio `roles-rename` no cierra las tres deudas. Sí cierra una brecha lateral: remover `usuarioId` del body de `CreatePlace` (ver `docs/api-spec.yml`), para evitar vector de spoofing cuando `auth` aterrice.

> **Favoritos (deferred):** el campo `favoritos` (places guardados por rol `member`) se modelará en el change futuro `auth + usuarios`, no en este. Las tres formas de almacenamiento bajo consideración son: (a) `usuarios.favoritos: string[]` (array de `placeId` en el doc), (b) subcolección `usuarios/{uid}/favoritos/{placeId}`, (c) colección top-level `favoritos` con docs `{usuarioId, placeId, createdAt}`. La shape se decidirá en ese change contra patrones de acceso reales (queries "favoritos de este usuario" vs "qué usuarios guardaron este place").

### solicitudes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | ID documento |
| placeId | string? (ref) | Place asociado (nullable para solicitudes de eventos; XOR con `eventoId`) |
| eventoId | string? (ref) | Evento asociado (nullable para solicitudes de places; XOR con `placeId`) |
| usuarioId | string (ref) | Usuario creador |
| tipo | enum | `registro` \| `actualizacion` \| `registro-evento` \| `actualizacion-evento` |
| status | enum | `pendiente` \| `aprobado` \| `rechazado` |
| proposal | object? | Staging de updates para `tipo: 'actualizacion-evento'` (JSON con los campos a aplicar al aprobar). Null para los demás `tipo`. |
| comentarios | string? | Comentarios |
| revisadoPor | string? | UID del admin que aprobó/rechazó. MUST resolver a un `usuarios.id` con `rol === 'admin'`. Hoy sin validación runtime (ver "Authentication debt" en §usuarios); el `RolesGuard` con `@Roles('admin')` se introduce en el change futuro `auth + usuarios`. |
| createdAt | Timestamp | Creación |
| revisadoAt | Timestamp? | Revisión |

> **Nota (módulo places):** al crear un place (`POST /api/v1/places`) se genera automáticamente un documento `solicitudes` con `tipo: 'registro'` y `status: 'pendiente'`, y el place queda en `status: 'pendiente'` hasta su aprobación por un admin.
>
> **Nota (módulo eventos):** al crear un evento (`POST /api/v1/eventos`) se genera automáticamente un documento `solicitudes` con `tipo: 'registro-evento'` y `status: 'pendiente'`, `eventoId` apuntando al nuevo evento. Al actualizar un evento aprobado se genera `tipo: 'actualizacion-evento'` con `proposal` conteniendo los campos staging (no se aplican in-place hasta el approval del admin).
>
> **Constraint XOR:** una `solicitud` referencia `placeId` **O** `eventoId`, nunca ambos (validado en `SolicitudesService`). `placeId` se vuelve nullable en esta extensión para soportar solicitudes de eventos; `eventoId` también es nullable para solicitudes de places.

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
| ubicacionNombre | string? | Nombre del lugar (ej: "Playa Amarilla") (1..200 chars) |
| ubicacionDireccion | string | Dirección completa (1..200 chars) |
| coordenadas | Coordenadas | `{ lat: number; lng: number }` (reuso del VO de `places`) |
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
| status | enum | `pendiente` \| `aprobado` \| `rechazado` (flujo `solicitudes`) |
| estado | enum | `borrador` \| `programado` \| `en_curso` \| `finalizado` \| `cancelado` \| `suspendido` (ciclo de vida del evento) |
| destacado | boolean | Destacado en home/listados (default `false`) |
| verificado | boolean | Verificado por admin (default `false`) |
| placeId | string? | Ref opcional a un `places` aprobado (ref geográfica/organizacional al lugar del evento). **Sin invariante de pertenencia** al place del creador del evento: el responsable es `usuarioId`, no el dueño del `placeId` referenciado. Si se setea, MUST referenciar un `places` con `status: 'aprobado'`. |
| usuarioId | string | Firebase Auth UID del creador (REQUIRED, seteado desde token verificado; no en DTO). Identifica al **responsable de publicación** del evento; es independiente de `eventos.placeId` — el responsable puede publicar eventos sin placeId, con su propio place, o con un place ajeno (referencia geográfica/organizacional, sin invariante de pertenencia). Ver §Reglas comunes "Responsabilidad del evento" para el detalle. |
| vistasTotales | number | Post-MVP placeholder, default 0 (sin lógica de incremento en este cambio, mirror de `places`) |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |
| fechaPublicacion | Timestamp? | Seteado cuando `status` pasa a `'aprobado'` (espejo de `places.fechaPublicacion`) |

**Value Objects y enums nuevos:**

- `PrecioTipo = 'gratis' | 'pago' | 'donacion' | 'invitacion'`
- `PrecioMoneda = 'CLP' | 'USD'`
- `PublicoObjetivoEnum = 'familia' | 'adultos' | 'tercera_edad' | 'mascotas' | 'todos' | 'ninos' | 'adolescentes'`
- `AccesibilidadEnum = 'acceso-silla-ruedas' | 'banos-accesibles' | 'estacionamiento-reservado' | 'interprete-señas' | 'material-braille' | 'rampa-acceso'`
- `NivelRuido = 'bajo' | 'medio' | 'alto'`
- `EventoStatus = 'pendiente' | 'aprobado' | 'rechazado'`
- `EventoEstado = 'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido'`
- `Coordenadas` — reusar el VO ya definido en `places`: `{ lat: number; lng: number }`

> **Nota (ciclo de vida del evento):** `status` rige el flujo de aprobación admin vía `solicitudes` (mirror de `places`). `estado` rige el ciclo de vida del evento (seteable por publisher/admin). En esta versión las transiciones automáticas `programado`→`en_curso`→`finalizado` basadas en `fechaInicio`/`fechaFin` **no se implementan** (Non-Goal post-MVP).

## Reglas de negocio del dominio

### Reglas comunes (places + eventos)

- Un place pertenece a una categoría y un barrio (`categoriaId`, `barrioId` obligatorios).
- `subcategoriaId` es opcional y debe referenciar un slug existente en `categorias.subcategorias[].slug` de la `categoriaId` seleccionada.
- `slug` de place/categoria/barrio debe ser único (verificar antes de crear).
- Todo place nuevo se crea con `status: 'pendiente'` y genera una `solicitud` con `placeId`.
- Solo rol `admin` aprueba/rechaza solicitudes y edita places ajenos.
- Rol `owner` solo gestiona su propio place (`placeId`) y crea eventos (`eventos.usuarioId === token.uid`).
- Rol `member` NO puede `POST /places` ni `POST /eventos` (403).
- Registro de usuarios: rol default `'member'` (cuando el módulo `auth + usuarios` aterrice).
- `galeria` en `imagenes`: plan gratuito máx 3 imágenes, plan premium máx 10.
- `horarios`: cada día puede tener 0..3 turnos; si `abierto: false`, `turnos` debe ser `[]`.
- `horariosEspeciales` sobrescribe `horarios` para la fecha indicada; `turnos: []` significa cerrado ese día.
- `abierto24x7: true` ignora `horarios` y `horariosEspeciales` (siempre abierto).
- Campos post-MVP (`idiomas`, `vistasTotales`, `valoracionGoogle` en places) se persisten como placeholders; no hay lógica de sincronía ni incremento en este cambio.
- Paginación por cursor Firestore (no offset). Índices compuestos requeridos.

### Responsabilidad del evento (places + eventos)

- El "responsable de publicación" del evento es `eventos.usuarioId` (quien lo crea/publica, autenticado via token).
- `eventos.placeId` es una referencia **opcional sin invariante de pertenencia** al place del creador. El evento puede:
  - Vincularse al place del propio creador (caso común).
  - Vincularse al place de otro `owner` (ej: festival comunitario organizado en un restaurante reconocido).
  - No vincularse a ningún place (`placeId: null` — festival en playa, sin venue en directorio).
- Cualquiera sea el caso, **el responsable sigue siendo `eventos.usuarioId`**, no el dueño del place referenciado. `placeId` representa el *lugar* del evento, no el *autor*.

### Reglas RBAC (solicitudes.revisadoPor)

- La regla "solo `admin` puede mutar `solicitudes.status` a `'aprobado'`/`'rechazado'`" se documenta en línea con el campo `solicitudes.revisadoPor` (ver §solicitudes arriba) para mantener la fuente canónica adyacente al schema. Este bloque de §Reglas comunes existe como referencia transversal.
- **Hoy no se valida en runtime** porque el módulo `auth` no está implementado (ver "Authentication debt" en §usuarios). El `RolesGuard` con `@Roles('admin')` se introduce en el change futuro `auth + usuarios`.


### Reglas específicas de eventos

- Un evento **siempre** tiene `categoriaId: 'eventos'` (constante, seteada por sistema; no se acepta en el DTO de create/update — forbidNonWhitelisted).
- `subcategoriaId` (evento) es **obligatorio** y debe ser uno de los 10 slugs sembrados para la categoría `eventos`: `festivales-culturales`, `ferias-gastronomicas`, `ferias-libres`, `deportes-y-competencias`, `conciertos-y-shows`, `talleres-y-clases-abiertas`, `eventos-familiares`, `temporada-de-verano`, `fiestas-patrias`, `mercados-sustentables`.
- `barrioId` (evento) referencia un `barrios` existente (validado antes de persistir).
- `fechaFin` debe ser estrictamente mayor que `fechaInicio`.
- `precioTipo='gratis'` ⟹ `precioValor === 0`. `precioTipo !== 'gratis'` ⟹ `precioValor > 0`.
- `publicoObjetivo` debe contener al menos un elemento del enum controlado.
- `placeId` (si presente) debe referenciar un `places` existente con `status: 'aprobado'`.
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

```
places: categoriaId (ASC)
places: barrioId (ASC)
places: status (ASC) + destacado (DESC) + createdAt (DESC)
places: slug (ASC) — único
categorias: slug (ASC) — único
categorias: activa (ASC) + orden (ASC)
barrios: slug (ASC) — único
barrios: tipo (ASC)
usuarios: email (ASC) — único
usuarios: rol (ASC)
solicitudes: placeId (ASC) + status (ASC)
solicitudes: eventoId (ASC) + status (ASC)
eventos: categoriaId (ASC) + fechaInicio (ASC)
eventos: barrioId (ASC) + fechaInicio (ASC)
eventos: status (ASC) + destacado (DESC) + fechaInicio (ASC)
eventos: slug (ASC) — único
eventos: usuarioId (ASC) + createdAt (DESC)
eventos: fechaInicio (ASC) + estado (ASC)
eventos: subcategoriaId (ASC) + fechaInicio (ASC)
```

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
  "status": "aprobado",
  "verificado": true,
  "fechaVerificacion": "2025-01-15T10:30:00Z",
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
  "activa": true,
  "subcategorias": [
    { "slug": "restaurantes", "nombre": "Restaurantes", "descripcion": "..." },
    { "slug": "cafeterias", "nombre": "Cafeterías", "descripcion": "..." }
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
  "coordenadas": null
}
```