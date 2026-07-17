# Data Model — Directorio de Empresas de Concón

> Fuente canónica del dominio (sincronizada con OpenSpec). Backend: Firebase Firestore.
> Referencia detallada de índices y reglas en `.github/instructions/database-instructions.md`.

## Entidades (colecciones Firestore)

### empresas
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK auto) | ID de documento Firestore |
| nombre | string | Nombre de la empresa |
| slug | string UNIQUE | Slug URL-friendly |
| descripcion | string | Descripción detallada |
| categoriaId | string (ref) | Referencia a categorías |
| barrioId | string (ref) | Referencia a barrios |
| direccion | string | Dirección física |
| telefono | string? | Teléfono (formato CL) |
| email | string? | Email contacto |
| sitioWeb | string? | URL sitio web |
| redesSociales | RedSocial[]? | Máx 3 |
| planId | enum | `gratuito` \| `premium` |
| horarios | string? | Horarios de atención |
| servicios | string[]? | Servicios principales |
| coordenadas | {lat, lng}? | Geolocalización |
| logoUrl | string? | URL Firebase Storage |
| destacado | boolean | Destacado en home |
| verificado | boolean | Verificado por admin |
| status | enum | `pendiente` \| `aprobado` \| `rechazado` |
| usuarioId | string | Propietario |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

### categorias
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | ID documento |
| nombre | string | Ej. "Restaurantes" |
| slug | string UNIQUE | Slug |
| descripcion | string | Descripción |
| icono | string | Icono Lucide |
| color | string? | Hex |
| orden | number | Orden visual |
| activa | boolean | Activa |
| createdAt | Timestamp | Creación |

### barrios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | ID documento |
| nombre | string | Ej. "Centro" |
| slug | string UNIQUE | Slug |
| codigo | string? | Código UV |
| descripcion | string | Descripción |
| coordenadas | {lat, lng}? | Centro del barrio |
| tipo | enum | `urbano` \| `rural` |
| createdAt | Timestamp | Creación |

### usuarios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (UID Auth) | UID Firebase Auth |
| email | string UNIQUE | Email |
| nombre | string | Nombre |
| rol | enum | `admin` \| `empresa` \| `usuario` |
| empresaId | string? | Si es dueño |
| telefono | string? | Teléfono |
| createdAt | Timestamp | Creación |
| updatedAt | Timestamp | Modificación |

### solicitudes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string (PK) | ID documento |
| empresaId | string (ref) | Empresa asociada |
| usuarioId | string (ref) | Usuario |
| tipo | enum | `registro` \| `actualizacion` |
| status | enum | `pendiente` \| `aprobado` \| `rechazado` |
| comentarios | string? | Comentarios |
| revisadoPor | string? | UID admin |
| createdAt | Timestamp | Creación |
| revisadoAt | Timestamp? | Revisión |

## Reglas de negocio del dominio

- Una empresa pertenece a una categoría y un barrio (`categoriaId`, `barrioId` obligatorios).
- `slug` de empresa/categoria/barrio debe ser único (verificar antes de crear).
- Toda empresa nueva se crea con `status: 'pendiente'` y genera una `solicitud`.
- Solo `admin` aprueba/rechaza solicitudes y edita empresas ajenas.
- Rol `empresa` solo gestiona su propia empresa (`empresaId`).
- Campos premium (galería, video, equipo, SEO) solo aplican si `planId === 'premium'`.
- Paginación por cursor Firestore (no offset). Índices compuestos requeridos.

## Índices Firestore requeridos

```
empresas: categoriaId (ASC)
empresas: barrioId (ASC)
empresas: status (ASC) + destacado (DESC) + createdAt (DESC)
empresas: slug (ASC) — único
categorias: slug (ASC) — único
categorias: activa (ASC) + orden (ASC)
barrios: slug (ASC) — único
barrios: tipo (ASC)
usuarios: email (ASC) — único
usuarios: rol (ASC)
```

## Convenciones de nombres

- Colecciones: plural, camelCase (`empresas`, `categorias`).
- Documentos: ID auto o slug kebab-case.
- Campos: camelCase (`empresaId`, `createdAt`, `updatedAt`).
- Timestamps: `createdAt`, `updatedAt` (Firestore Timestamp).
