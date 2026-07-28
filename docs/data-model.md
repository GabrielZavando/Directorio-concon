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

- `RedSocial = { plataforma: string; url: string }`
- `Imagenes = { logo?: string; portada?: string; galeria: string[] }`
- `HorarioDia = { dia: DiaSemana; abierto: boolean; turnos: Turno[] }`
- `Turno = { apertura: 'HH:mm'; cierre: 'HH:mm' }` (apertura < cierre)
- `HorarioEspecial = { fecha: 'YYYY-MM-DD'; descripcion: string; turnos: Turno[] }`
- `DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'`
- `ServicioEnum = 'wifi' | 'estacionamiento' | 'acceso-discapacidad' | 'apto-mascotas' | 'delivery' | 'take-away' | 'terraza' | 'vista-al-mar' | 'reservas' | 'ninos-bienvenida'`
- `MetodoPagoEnum = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'qr'`
- `ValoracionGoogle = { rating: number; reviewsCount: number; mapsLink: string }`

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
| rol | enum | `admin` \| `empresa` \| `usuario` |
| placeId | string? | Si es dueño de un place |
| telefono | string? | Teléfono |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

### solicitudes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | ID documento |
| placeId | string (ref) | Place asociado |
| usuarioId | string (ref) | Usuario |
| tipo | enum | `registro` \| `actualizacion` |
| status | enum | `pendiente` \| `aprobado` \| `rechazado` |
| comentarios | string? | Comentarios |
| revisadoPor | string? | UID admin |
| createdAt | Timestamp | Creación |
| revisadoAt | Timestamp? | Revisión |

> **Nota (módulo places):** al crear un place (`POST /api/v1/places`) se genera automáticamente un documento `solicitudes` con `tipo: 'registro'` y `status: 'pendiente'`, y el place queda en `status: 'pendiente'` hasta su aprobación por un admin.

## Reglas de negocio del dominio

- Un place pertenece a una categoría y un barrio (`categoriaId`, `barrioId` obligatorios).
- `subcategoriaId` es opcional y debe referenciar un slug existente en `categorias.subcategorias[].slug` de la `categoriaId` seleccionada.
- `slug` de place/categoria/barrio debe ser único (verificar antes de crear).
- Todo place nuevo se crea con `status: 'pendiente'` y genera una `solicitud` con `placeId`.
- Solo `admin` aprueba/rechaza solicitudes y edita places ajenos.
- Rol `empresa` solo gestiona su propio place (`placeId`).
- `galeria` en `imagenes`: plan gratuito máx 3 imágenes, plan premium máx 10.
- `horarios`: cada día puede tener 0..3 turnos; si `abierto: false`, `turnos` debe ser `[]`.
- `horariosEspeciales` sobrescribe `horarios` para la fecha indicada; `turnos: []` significa cerrado ese día.
- `abierto24x7: true` ignora `horarios` y `horariosEspeciales` (siempre abierto).
- Campos post-MVP (`idiomas`, `vistasTotales`, `valoracionGoogle`) se persisten como placeholders; no hay lógica de sincronía ni incremento en este cambio.
- Paginación por cursor Firestore (no offset). Índices compuestos requeridos.

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