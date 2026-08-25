# Plan de Implementación — Refactorización Completa de Flujos

> **Nota 2026-08-24:** `AUDITORIA_PROYECTO.md` fue eliminado por estar obsoleto (sus hallazgos críticos ya están resueltos y archivados en OpenSpec). Este plan permanece como roadmap vivo: cada change se marca DONE al archivarse.

## Tracking de Changes

| CH | Change | Estado | Change OpenSpec |
|----|--------|--------|-----------------|
| CH-01 | categorias-barrios-crud | ✅ DONE | `archive/2026-08-23-categorias-barrios-crud` |
| CH-02 | auth-usuarios-v2 | ✅ DONE | `archive/2026-08-25-auth-usuarios-v2` (backend completo; páginas frontend de auth — Tasks 8–10 — y E2E backend quedan cubiertas por CH-08 `frontend-mvp-v2` / change E2E dedicado) |
| CH-03 | places-refactor | ⬜ PENDING | — |
| CH-04 | eventos-refactor | ⬜ PENDING | — |
| CH-05 | solicitudes-refactor | ⬜ PENDING | — |
| CH-06 | notificaciones | ⬜ PENDING | — |
| CH-07 | favoritos | ⬜ PENDING | — |
| CH-08 | frontend-mvp-v2 | ⬜ PENDING | — |

**Basado en:** Especificación de 5 flujos revisados + Respuestas de validación (la auditoría original 2026-07-31 ya no existe como archivo)  
**Metodología:** Spec-Driven Development (OpenSpec) — cada phase = un openspec change  
**Principio:** Un cambio a la vez, TDD, specs antes que código, DIP estricto  
**Entorno:** Desarrollo — datos mock/inventados para places/eventos; seed desde JSONs categorias/barrios; Google Places API post-MVP  
**Email:** Resend no configurado — templates requeridos en CH-06  
**Testing:** Unit + Integration + E2E obligatorios en cada change (Jest + Supertest backend; Jasmine/Karma + Cypress/Playwright frontend)  
**Admin UI:** Angular Material (panel admin) — Design System "Dunas y Océano" (sitio público)

---

## Análisis de Dependencias

```
PHASE 0: FOUNDATION (paralelos, sin deps entre si)
  CH-01: categorias-barrios-crud    <-->  CH-02: auth-usuarios-v2
  (Flow 5)                          (Flow 4 + Flow 1 auth)

PHASE 1: CORE DOMAIN REFACTOR (dependen de Phase 0)
  CH-03: places-refactor        <-->  CH-04: eventos-refactor
  (Flow 1 + Flow 2)             (Flow 3)
                                  |
                                  v
                         CH-05: solicitudes-refactor
                         (solo reclamo-place)

PHASE 2: CROSS-CUTTING (dependen de Phase 1)
  CH-06: notificaciones         <-->  CH-07: favoritos
  (Flow 1, 3, 4)                (Flow 4 - member)

PHASE 3: FRONTEND (depende de todo el backend)
  CH-08: frontend-mvp-v2
  (Owner panel, Place detail, Badges, Auth flow, Map updates)
```

---

## DECISIONES CONFIRMADAS (del usuario)

| # | Decisión | Detalle |
|---|----------|---------|
| 1 | **8 Changes OpenSpec** | Confirmado — no agrupar places+eventos |
| 2 | **Datos desarrollo** | Mock/inventados para places/eventos; seed desde JSONs categorias/barrios; Google Places API post-MVP |
| 3 | **Email/Resend** | No configurado — CH-06 DEBE incluir templates de email + configuración Resend |
| 4 | **Congelación ediciones eventos** | Postergado a post-MVP — CH-04 implementa reversión simple sin regla de días |
| 5 | **Límite favoritos** | 50 por usuario — validado en POST /favoritos |
| 6 | **Admin UI** | Angular Material para paneles admin; Design System público para sitio |
| 7 | **Testing** | Unit + Integration + E2E obligatorios en CADA change |

---

## PHASE 0 — FOUNDATION (2 changes paralelos)

### CH-01: categorias-barrios-crud — Flow 5 ✅ DONE (archivado `2026-08-23-categorias-barrios-crud`)

**Alcance:** Módulos `categorias` y `barrios` Clean Architecture + seed + endpoints admin/públicos + validación cruzada

#### Backend — Estructura Clean Architecture (NUEVOS MÓDULOS)

```
backend/src/modules/categorias/
  domain/
    categoria.entity.ts                    // Entity + VO Subcategoria
    categoria-repository.interface.ts      // Interface ≤5 métodos (CRUD + findBySlug + findActive)
  application/
    categorias.service.ts                  // Orquesta domain + infrastructure via interfaces
    validators/categoria.validator.ts      // Reglas: slug único, orden único, icono Lucide válido
  infrastructure/
    categoria-firestore.adapter.ts         // Implementa repository interface
    dto/
      create-categoria.dto.ts              // class-validator: @IsString, @MinLength, @MaxLength, @IsOptional, @IsIn(LucideIcons)
      update-categoria.dto.ts              // PartialType + @IsOptional
      create-subcategoria.dto.ts
      update-subcategoria.dto.ts
      query-categoria.dto.ts               // @IsOptional @IsBoolean activa
    categorias.controller.ts               // @Controller('categorias'), @UseGuards(JwtAuthGuard, RolesGuard), @Roles('admin')
  categorias.module.ts

backend/src/modules/barrios/
  domain/
    barrio.entity.ts
    barrio-repository.interface.ts
  application/
    barrios.service.ts
    validators/barrio.validator.ts
  infrastructure/
    barrio-firestore.adapter.ts
    dto/
      create-barrio.dto.ts
      update-barrio.dto.ts
      query-barrio.dto.ts
    barrios.controller.ts
  barrios.module.ts
```

#### Endpoints Admin (solo `admin` — `@Roles('admin')`)

| Método | Path | Descripción | Validaciones |
|--------|------|-------------|--------------|
| POST | `/api/v1/categorias` | Crea categoría | slug único, icono ∈ LucideIcons, orden único, activo=true |
| PATCH | `/api/v1/categorias/:id` | Edita nombre, icono, orden | icono ∈ LucideIcons, orden único si cambia |
| PATCH | `/api/v1/categorias/:id/desactivar` | `activo: false` | No permite si tiene places/eventos activos (validación suave: warning, no bloqueo) |
| PATCH | `/api/v1/categorias/:id/activar` | `activo: true` | — |
| POST | `/api/v1/categorias/:id/subcategorias` | Agrega al array `subcategorias` | **Transacción Firestore** (read-modify-write atómico), slug único dentro de categoría, activo=true |
| PATCH | `/api/v1/categorias/:id/subcategorias/:subId/desactivar` | `activo: false` en sub | — |
| POST | `/api/v1/barrios` | Crea barrio | slug único, tipo ∈ {urbano,rural}, activo=true |
| PATCH | `/api/v1/barrios/:id` | Edita datos | — |
| PATCH | `/api/v1/barrios/:id/desactivar` | `activo: false` | Warning si places/eventos activos |
| PATCH | `/api/v1/barrios/:id/activar` | `activo: true` | — |

#### Endpoints Públicos (sin auth — `@Public()`)

| Método | Path | Response |
|--------|------|----------|
| GET | `/api/v1/categorias?activa=true` | Solo `activo: true`, y dentro `subcategorias` filtradas a `activo: true` |
| GET | `/api/v1/barrios?activo=true` | Solo `activo: true` |

#### Validación Cruzada (en PlacesService/EventosService)

```typescript
// En create/update place/evento — SOLO cuando el campo se toca
async validateCategoriaId(categoriaId: string): Promise<void> {
  const cat = await this.categoriasRepo.findById(categoriaId);
  if (!cat || !cat.activo) throw new BadRequestException('Categoría inválida o inactiva');
}
async validateSubcategoriaId(categoriaId: string, subcategoriaId: string): Promise<void> {
  const cat = await this.categoriasRepo.findById(categoriaId);
  const sub = cat?.subcategorias?.find(s => s.slug === subcategoriaId && s.activo);
  if (!sub) throw new BadRequestException('Subcategoría inválida o inactiva');
}
async validateBarrioId(barrioId: string): Promise<void> {
  const barrio = await this.barriosRepo.findById(barrioId);
  if (!barrio || !barrio.activo) throw new BadRequestException('Barrio inválido o inactivo');
}
```

#### Seed Script

- `backend/scripts/seed.ts` — Lee `frontend/src/app/shared/data-access/local/data/categorias.json` y `barrios.json`
- Usa `CategoriaFirestoreAdapter` y `BarrioFirestoreAdapter` (no admin SDK directo — DIP)
- Idempotente: `set(..., {merge: true})` por slug
- `npm run seed` en `backend/package.json` → `ts-node scripts/seed.ts`
- **Datos mock para places/eventos:** Script separado `backend/scripts/seed-places.ts` con 20-30 places inventados + 10-15 eventos inventados (para testing manual y E2E)

#### Firestore Indexes (actualizar `firestore.indexes.json`)

```json
{
  "collectionGroup": "categorias",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "activa", "order": "ASCENDING"},
    {"fieldPath": "orden", "order": "ASCENDING"}
  ]
},
{
  "collectionGroup": "barrios",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "tipo", "order": "ASCENDING"}
  ]
}
```

#### Migración Previa (OBLIGATORIA antes de activar validación)

```typescript
// backend/scripts/audit-cat-barrio-refs.ts
// 1. Recorre places + eventos existentes
// 2. Verifica cada categoriaId/barrioId existe en nuevas colecciones
// 3. Reporte: {validos: [], huérfanos: [{coleccion, docId, campo, valor}]}
// 4. Corrección manual de huérfanos → luego activar validación bloqueante
```

#### Testing Requerido (CH-01)

| Tipo | Qué testear | Cobertura objetivo |
|------|-------------|-------------------|
| Unit | `CategoriasService`, `BarriosService`, validators | 95% |
| Integration | `CategoriaFirestoreAdapter`, `BarrioFirestoreAdapter` (emulador Firestore) | 90% |
| E2E | Todos los endpoints admin + públicos (Supertest) | 100% happy paths + 400/403/409 |
| Contrato | `categoria-repository.contract.spec.ts` (LSP) | 100% |

#### OpenSpec Artifacts

```
openspec/changes/2026-XX-XX-categorias-barrios-crud/
  requirements.md      // Reglas de negocio, endpoints, validaciones, seed, migración
  scenarios.md         // Gherkin: 15+ scenarios (admin CRUD, select público, validación cruzada, seed, migración)
  tasks.md             // 35-40 tasks granulares (ver desglose abajo)
```

#### Tasks.md Desglose (CH-01)

```
[ ] Setup: crear estructura módulos categorias/barrios (domain/app/infrastructure)
[ ] Domain: CategoriaEntity, SubcategoriaVO, BarrioEntity + interfaces repository
[ ] Application: CategoriasService, BarriosService + validators
[ ] Infrastructure: Firestore adapters + DTOs (class-validator completo)
[ ] Controllers: CategoriasController, BarriosController + guards + @Public()
[ ] Module wiring: CategoriasModule, BarriosModule en app.module.ts
[ ] Seed: script seed.ts + npm script + datos mock places/eventos
[ ] Indexes: actualizar firestore.indexes.json + deploy indexes
[ ] Migración: script auditoría referencias + guía corrección manual
[ ] Tests: unit (service, validators), integration (adapters), e2e (controllers)
[ ] Docs: actualizar data-model.md, api-spec.yml, backend-standards.md
[ ] Lint: solid-lint pasa sin violations
```

---

### CH-02: auth-usuarios-v2 — Flow 4 (auth) + Flow 1 (registro owner)

**Alcance:** Self-registration con selección de rol, email verification obligatoria, eliminación aprovisionamiento admin, relación invertida place-usuario

#### Cambios en `auth` module

```typescript
// backend/src/modules/auth/application/auth.service.ts
interface RegisterWithRoleInput {
  email: string;
  password: string;
  rol: 'member' | 'owner';
  nombre: string;
}

async registerWithRole(input: RegisterWithRoleInput): Promise<AuthResult> {
  // 1. Firebase Auth createUser({email, password, displayName: nombre})
  // 2. await sendEmailVerification(userRecord.uid)
  // 3. Firestore usuarios/{uid} = {email, nombre, rol, emailVerified: false, createdAt, updatedAt}
  // 4. Return {uid, email, rol, emailVerified: false}
}

// Nuevo método para guards
async verifyEmailAndGetContext(uid: string): Promise<AuthContext> {
  const userRecord = await admin.auth().getUser(uid);
  if (!userRecord.emailVerified) throw new ForbiddenException('Email no verificado');
  const usuarioDoc = await this.usuariosRepo.findById(uid);
  return {uid, email: userRecord.email, rol: usuarioDoc.rol, placeId: usuarioDoc.placeId ?? null};
}
```

```typescript
// backend/src/modules/auth/application/guards/email-verified.guard.ts
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private authService: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthContext; // seteado por JwtAuthGuard
    await this.authService.verifyEmailAndGetContext(user.uid);
    return true;
  }
}
```

#### Cambios en `usuarios` module

- **ELIMINAR:** `POST /api/v1/usuarios` (controller + service + dto)
- **MANTENER:** `GET /api/v1/usuarios/me`, `PUT /api/v1/usuarios/me` (sin cambios)
- **CAMBIAR:** `PUT /api/v1/usuarios/:uid/rol` — body `{rol: 'admin'|'member'}` (solo admin, no permite 'owner')
- **ELIMINAR campo en entidad:** `placeId` — relación invertida (place.usuarioId apunta a usuario)

#### Nuevo Endpoint Público

```typescript
// POST /api/v1/auth/registro
@Post('registro')
@Public()
async register(@Body() dto: RegisterDto) {
  return this.authService.registerWithRole(dto);
}

// DTO
class RegisterDto {
  @IsEmail() email: string;
  @MinLength(8) password: string;
  @IsIn(['member', 'owner']) rol: 'member' | 'owner';
  @MinLength(2) @MaxLength(100) nombre: string;
}
```

#### Firebase Auth Config (documentar en `docs/deploy-standards.md`)

- Habilitar **Email/Password** + **Google** provider en Firebase Console
- `sendEmailVerification()` nativo — actionCodeSettings: `url: https://directorio-concon.com/verificar-email`
- Custom claim `rol` opcional (sync via Cloud Function onCreate `usuarios` doc) para performance en guards

#### Frontend — Auth Flow (PARCIAL - solo auth)

| Componente | Ruta | Descripción |
|------------|------|-------------|
| `RegisterPageComponent` | `/registrarse` | Radio: "Quiero descubrir lugares" (member) / "Quiero registrar mi negocio" (owner). Form reactivo + Firebase Auth signup. Redirect a `/verificar-email` |
| `LoginPageComponent` | `/login` | Email/password + Google. Maneja error 403 "Email no verificado" → botón "Reenviar verificación" llama `sendEmailVerification()` |
| `EmailVerificationPageComponent` | `/verificar-email` | Landing "Revisa tu bandeja". Botón "Reenviar" si expiró. Auto-check cada 30s si `emailVerified` → redirect a `/mi-panel` (owner) o `/` (member) |
| `AuthService` (frontend) | — | Wrapper Firebase Auth + calls a backend `/auth/registro`, `/usuarios/me` |

#### Testing Requerido (CH-02)

| Tipo | Qué testear |
|------|-------------|
| Unit | `AuthService.registerWithRole`, `verifyEmailAndGetContext`, `EmailVerifiedGuard` |
| Integration | `UsuariosFirestoreAdapter` (crear doc usuario, findById, updateRol) |
| E2E | Flujo completo: registro member → login bloqueado → verifica email → login ok; registro owner → panel acceso; cambio rol admin→member |
| Contrato | `usuario-repository.contract.spec.ts`, `auth-context.interface.ts` |

#### OpenSpec Artifacts

```
openspec/changes/2026-XX-XX-auth-usuarios-v2/
  requirements.md      // Flujo registro, verificación, guards, endpoints, campos entidad
  scenarios.md         // Gherkin: 12+ scenarios (registro member/owner, login bloqueado, reenvío, cambio rol, eliminación prov admin)
  tasks.md             // 25-30 tasks granulares
```

#### Tasks.md Desglose (CH-02)

```
[ ] AuthService: registerWithRole(), verifyEmailAndGetContext()
[ ] EmailVerifiedGuard + registrar en providers
[ ] Eliminar POST /usuarios (controller, service, dto, tests)
[ ] Modificar PUT /usuarios/:uid/rol → solo admin|member, validar no 'owner'
[ ] Eliminar campo placeId en UsuarioEntity, adapter, DTOs
[ ] Nuevo endpoint POST /auth/registro (controller + dto + validation)
[ ] Firebase Auth config docs + custom claim sync (opcional)
[ ] Frontend: RegisterPageComponent, LoginPageComponent, EmailVerificationPageComponent
[ ] Frontend: AuthService wrapper, guards de ruta (canActivate emailVerified)
[ ] Seed: script para crear primer admin (Firebase Console + Firestore manual)
[ ] Tests: unit (auth service, guards), integration (usuarios adapter), e2e (flujos completos)
[ ] Docs: data-model.md (usuarios sin placeId), api-spec.yml (endpoints auth/usuarios), deploy-standards.md
```

---

## PHASE 1 — CORE DOMAIN REFACTOR

### CH-03: places-refactor — Flow 1 (owner) + Flow 2 (público)

#### Modelo Nuevo (`places` collection)

```typescript
// backend/src/modules/places/domain/place.entity.ts
interface Place {
  id: string;
  nombre: string;
  slug: string;
  descripcionCorta: string;
  descripcion: string;
  categoriaId: string;
  subcategoriaId?: string;
  barrioId: string;
  direccion: string;
  coordenadas: Coordenadas;
  telefono?: string;
  whatsapp?: string;
  email?: string;
  sitioWeb?: string;
  redesSociales: RedSocial[];
  imagenes: Imagenes;
  planId: 'gratuito' | 'premium';
  horarios: HorarioDia[];
  horariosEspeciales: HorarioEspecial[];
  abierto24x7: boolean;
  servicios: ServicioEnum[];
  metodosPago: MetodoPagoEnum[];
  idiomas?: string[];
  // NUEVOS:
  activo: boolean;                              // default true
  estadoVerificacion: 'pendiente' | 'verificado' | 'rechazado';  // default 'pendiente'
  motivoRechazoVerificacion?: string;           // required si rechazado
  gestionadoPorAdmin: boolean;                  // true si creado por admin
  usuarioId: string;                            // owner uid (required)
  // ELIMINADOS: status, verificado, fechaVerificacion
  destacado: boolean;
  vistasTotales: number;
  valoracionGoogle?: ValoracionGoogle;
  fechaPublicacion?: Timestamp;                 // cuando pasó a verificado
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Endpoints Modificados

| Método | Path | Cambios Clave |
|--------|------|---------------|
| POST | `/api/v1/places` | **Efecto:** `activo: true`, `estadoVerificacion: 'pendiente'`, `gestionadoPorAdmin: false`. **NO crea solicitud**. Guard: `@Roles('owner')` + `EmailVerifiedGuard`. Body sin `usuarioId` (forbidNonWhitelisted) |
| GET | `/api/v1/places` | Filtro `activo=true`. Query params: categoriaId, barrioId, q, page, limit. **Incluye `estadoVerificacion` en response** |
| GET | `/api/v1/places/slug/:slug` | Filtro `activo=true`. 404 si `activo=false`. Incluye `estadoVerificacion` |
| GET | `/api/v1/places/map-data` | Filtro `activo=true`. Payload sin cambios |
| PUT | `/api/v1/places/:id` | **Ownership guard:** valida `place.usuarioId === request.user.uid` (no solo rol). `@Roles('owner','admin')` + `EmailVerifiedGuard` |
| PATCH | `/api/v1/places/:id/destacar` | **Nueva validación:** `estadoVerificacion === 'verificado'` → 409 si no. Solo `@Roles('admin')` |

#### Endpoints Nuevos (Owner)

| Método | Path | Descripción |
|--------|------|-------------|
| POST | `/api/v1/places/:id/reclamar` | Crea `solicitud` tipo `'reclamo-place'` con `placeId`, `solicitanteUid: request.user.uid`, `status: 'pendiente'`. Permite múltiples simultáneas. Guard: `@Roles('owner')` + `EmailVerifiedGuard` |
| GET | `/api/v1/places?sinDueno=true` | Filtra `usuarioId == null OR gestionadoPorAdmin == true` + `activo=true`. Para listado reclamables |

#### Endpoints Nuevos (Admin)

| Método | Path | Body | Efecto |
|--------|------|------|--------|
| POST | `/api/v1/places/:id/verificar` | `{resultado: 'verificado'|'rechazado', motivo?: string}` | `motivo` **required** si `rechazado` (ValidationPipe `@IsNotEmpty()` condicional). Verificado: `estadoVerificacion='verificado'`, `fechaPublicacion=now`. Rechazado: `estadoVerificacion='rechazado'`, `activo=false`, `motivoRechazoVerificacion=motivo` |
| GET | `/api/v1/places?estadoVerificacion=pendiente` | — | Cola verificación admin (paginado) |

#### Solicitudes — Cambio de Alcance

- Solo `tipo: 'reclamo-place'` para places
- `SolicitudesService.approve()` para reclamo:
  ```typescript
  // Transacción atómica
  await runTransaction(db, async (tx) => {
    const placeRef = db.collection('places').doc(solicitud.placeId);
    const place = await tx.get(placeRef);
    tx.update(placeRef, {usuarioId: solicitud.solicitanteUid, gestionadoPorAdmin: false});
    // Auto-rechazar otras pendientes del mismo placeId
    const otherReclamos = await db.collection('solicitudes')
      .where('placeId', '==', solicitud.placeId)
      .where('tipo', '==', 'reclamo-place')
      .where('status', '==', 'pendiente')
      .where('id', '!=', solicitud.id)
      .get();
    otherReclamos.docs.forEach(d => tx.update(d.ref, {status: 'rechazado', revisadoPor: 'system', revisadoAt: now}));
    tx.update(solicitudRef, {status: 'aprobado', revisadoPor: adminUid, revisadoAt: now});
  });
  ```

#### Firestore Indexes (actualizar)

```json
// Reemplazar 'status' por 'activo' en índices existentes
// places: activo + categoriaId + barrioId + destacado + createdAt
// places: activo + estadoVerificacion + categoriaId + barrioId + destacado + createdAt (nuevo)
// solicitudes: placeId + status (existente, sirve para reclamo-place)
```

#### Migración de Datos (Script One-Time)

```typescript
// backend/scripts/migrate-places-verificacion.ts
async function migratePlaces() {
  const places = await db.collection('places').get();
  const batch = db.batch();
  places.docs.forEach(doc => {
    const data = doc.data();
    const updates = {
      activo: data.status === 'aprobado',
      estadoVerificacion: data.verificado === true ? 'verificado' : 'pendiente',
      gestionadoPorAdmin: false, // o true si data.usuarioId es admin conocido
      // motivoRechazoVerificacion: null
    };
    // Eliminar campos viejos
    batch.update(doc.ref, {...updates, status: FieldValue.delete(), verificado: FieldValue.delete(), fechaVerificacion: FieldValue.delete()});
  });
  await batch.commit();
}
```

#### Testing Requerido (CH-03)

| Tipo | Escenarios Críticos |
|------|---------------------|
| Unit | `PlacesService.create`, `update`, `reclamar`, `verificar`, validators, ownership guard |
| Integration | `PlaceFirestoreAdapter` (CRUD, query activo, query sinDueño, transacciones) |
| E2E | Owner crea place → visible público inmediato → admin verifica → badge verde; admin rechaza → place despublicado; owner reclama place admin → auto-rechaza otros reclamos; PUT place sin ownership → 403; destacar sin verificado → 409 |

#### OpenSpec Artifacts

```
openspec/changes/2026-XX-XX-places-refactor/
  requirements.md      // Modelo, endpoints, reglas claiming/verificación, migración
  scenarios.md         // Gherkin: 20+ scenarios
  tasks.md             // 40-45 tasks
```

---

### CH-04: eventos-refactor — Flow 3

#### Modelo Nuevo (`eventos` collection)

```typescript
// backend/src/modules/eventos/domain/evento.entity.ts
interface Evento {
  id: string;
  slug: string;
  nombre: string;
  descripcionCorta: string;
  descripcion: string;
  categoriaId: 'eventos'; // constante, no en DTO
  subcategoriaId: string; // uno de 10 slugs fijos
  barrioId: string;
  organizador: string;
  organizadorContacto?: string;
  organizadorWeb?: string;
  ubicacion: {           // NUEVO - reemplaza placeId
    nombreLugar: string;
    direccion: string;
    coordenadas: Coordenadas;
  };
  fechaInicio: Timestamp;
  fechaFin: Timestamp;
  precioTipo: 'gratis' | 'pago' | 'donacion' | 'invitacion';
  precioValor: number;
  precioMoneda: 'CLP' | 'USD';
  capacidadMaxima?: number;
  publicoObjetivo: PublicoObjetivoEnum[];
  nivelRuido: 'bajo' | 'medio' | 'alto';
  portada?: string;
  accesibilidad: AccesibilidadEnum[];
  // NUEVOS:
  activo: boolean;                              // default true
  estadoVerificacion: 'pendiente' | 'verificado' | 'rechazado';  // default 'pendiente'
  motivoRechazoVerificacion?: string;           // required si rechazado
  // ELIMINADOS: status, placeId
  estado: 'borrador' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'suspendido';
  destacado: boolean;
  verificado: boolean; // legacy? mantener por compat o eliminar
  usuarioId: string;       // creador (owner O admin)
  vistasTotales: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  fechaPublicacion?: Timestamp;
  // MEJORA: Historial cambios
  cambios?: Array<{campo: string, valorAnterior: any, valorNuevo: any, fecha: Timestamp, usuarioId: string}>;
}
```

#### Endpoints Modificados

| Método | Path | Cambios |
|--------|------|---------|
| POST | `/api/v1/eventos` | **Guard:** `@Roles('owner','admin')` + `EmailVerifiedGuard`. Body: **sin `placeId`**, **con `ubicacion`**. Crea `activo: true`, `estadoVerificacion: 'pendiente'`. **NO crea solicitud** |
| PUT | `/api/v1/eventos/:id` | **Lógica unificada:** Aplica cambios directo. Si `estadoVerificacion === 'verificado'` ANTES → revierte a `'pendiente'` (mismo write, popula `cambios[]`). **No bifurca por status anterior**. Guard: ownership (`evento.usuarioId === uid`) OR admin |
| GET | `/api/v1/eventos` | Filtro `activo=true`. Incluye `estadoVerificacion` |
| GET | `/api/v1/eventos/mapa` | Filtro `activo=true` |
| GET | `/api/v1/eventos/slug/:slug` | Filtro `activo=true`, 404 si `activo=false`. Incluye `estadoVerificacion` |

#### Endpoints Nuevos (Admin)

| Método | Path | Body | Efecto |
|--------|------|------|--------|
| POST | `/api/v1/eventos/:id/verificar` | `{resultado: 'verificado'|'rechazado', motivo?: string}` | `motivo` required si rechazado. Verificado: `estadoVerificacion='verificado'`. Rechazado: `estadoVerificacion='rechazado'`, `activo=false`, `motivoRechazoVerificacion=motivo` |
| GET | `/api/v1/eventos?estadoVerificacion=pendiente` | — | Cola verificación admin |

#### Historial de Cambios (Implementar en CH-04)

```typescript
// En EventosService.update()
async update(id: string, dto: UpdateEventoDto, user: AuthContext): Promise<Evento> {
  const evento = await this.repo.findById(id);
  const eraVerificado = evento.estadoVerificacion === 'verificado';
  const cambios = this.computeChanges(evento, dto); // [{campo, anterior, nuevo, fecha, usuarioId}]
  
  const updates = {...dto, updatedAt: now, cambios: [...(evento.cambios || []), ...cambios]};
  if (eraVerificado) updates.estadoVerificacion = 'pendiente'; // Reversión automática
  
  return this.repo.update(id, updates);
}
```

#### Notificación Diferenciada (Implementar en CH-04 + CH-06)

- Si `eraVerificado` → notificar **también al admin** (tipo `evento_revertido_pendiente`)

#### Firestore Indexes

```json
// Reemplazar 'status' por 'activo' en índices compuestos existentes
// eventos: estadoVerificacion + activo + subcategoriaId + barrioId + fechaInicio (nuevo)
```

#### Migración de Datos

```typescript
// backend/scripts/migrate-eventos-verificacion.ts
// Similar a places + construir ubicacion desde placeId si existía
```

#### Testing Requerido (CH-04)

| Tipo | Escenarios Críticos |
|------|---------------------|
| Unit | `EventosService.create`, `update` (reversión verificado), `verificar`, validators, ubicacion |
| Integration | `EventoFirestoreAdapter` (CRUD, query activo, transacciones) |
| E2E | Owner crea evento → visible inmediato → admin verifica → badge verde; admin rechaza → despublicado; owner edita evento verificado → revierte a pendiente + notifica admin; PUT sin ownership → 403 |

#### OpenSpec Artifacts

```
openspec/changes/2026-XX-XX-eventos-refactor/
  requirements.md      // Modelo, ubicacion, verificación, edición revierte, historial
  scenarios.md         // Gherkin: 18+ scenarios
  tasks.md             // 35-40 tasks
```

---

### CH-05: solicitudes-refactor — Alcance Reducido

#### Cambios

- **Eliminar tipos:** `'registro'`, `'actualizacion'`, `'registro-evento'`, `'actualizacion-evento'`
- **Mantener solo:** `'reclamo-place'`
- **Campos solicitud:** `placeId` (required), `solicitanteUid` (required), `tipo: 'reclamo-place'`, `status`, `comentarios?`, `revisadoPor?`, `revisadoAt?`, `createdAt`
- **Eliminar:** `eventoId`, `proposal`
- **Endpoint `GET /api/v1/solicitudes?status=pendiente`** → solo devuelve `reclamo-place`
- **Approve logic:** auto-rechaza otras pendientes del mismo `placeId` (ya definido en CH-03)

#### Migración

```typescript
// backend/scripts/migrate-solicitudes.ts
// 1. Eliminar docs con tipo != 'reclamo-place'
// 2. Para reclamo-place existentes: asegurar solicitanteUid poblado
```

#### Testing Requerido (CH-05)

| Tipo | Qué testear |
|------|-------------|
| Unit | `SolicitudesService` (create reclamo, approve con auto-rechazo, reject) |
| Integration | `SolicitudesFirestoreAdapter` |
| E2E | Owner reclama place → admin aprueba → place.usuarioId actualizado + otros reclamos auto-rechazados |

#### OpenSpec Artifacts

```
openspec/changes/2026-XX-XX-solicitudes-refactor/
  requirements.md
  scenarios.md       // 5-6 scenarios
  tasks.md           // 10-12 tasks
```

---

## PHASE 2 — CROSS-CUTTING (2 changes paralelos)

### CH-06: notificaciones — Flow 1, 3, 4

#### Colección `notificaciones`

```typescript
// backend/src/modules/notificaciones/domain/notificacion.entity.ts
interface Notificacion {
  id: string;
  usuarioId: string;           // destinatario
  tipo: 'place_verificado' | 'place_rechazado' | 'reclamo_aprobado' | 'reclamo_rechazado' | 'evento_verificado' | 'evento_rechazado' | 'evento_revertido_pendiente' | 'favorito_agregado';
  titulo: string;
  mensaje: string;             // incluye motivo si rechazo
  datos?: { placeId?: string, eventoId?: string, solicitudId?: string };
  leida: boolean;              // default false
  createdAt: Timestamp;
}
```

#### Endpoints (cualquier rol autenticado — `@Roles('admin','owner','member')`)

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/api/v1/notificaciones/me?leida=false&page=1&limit=20` | Lista paginada del usuario autenticado |
| PATCH | `/api/v1/notificaciones/:id/leida` | Marca leída |
| GET | `/api/v1/notificaciones/me/count?leida=false` | Contador para badge en header |

#### Disparadores (en Services correspondientes)

```typescript
// PlacesService.verificar()
if (resultado === 'verificado') {
  await this.notificacionesService.create({
    usuarioId: place.usuarioId,
    tipo: 'place_verificado',
    titulo: 'Tu place ha sido verificado',
    mensaje: 'El lugar ahora muestra el badge "Verificado"',
    datos: {placeId: place.id}
  });
} else {
  await this.notificacionesService.create({
    usuarioId: place.usuarioId,
    tipo: 'place_rechazado',
    titulo: 'Tu place fue rechazado en verificación',
    mensaje: `Motivo: ${motivo}`,
    datos: {placeId: place.id}
  });
}

// SolicitudesService.approveReclamo() → tipo 'reclamo_aprobado' a solicitanteUid
// EventosService.verificar() → tipo 'evento_verificado'/'evento_rechazado' a evento.usuarioId
// EventosService.update() si eraVerificado → tipo 'evento_revertido_pendiente' a evento.usuarioId + NOTIFICAR ADMIN
// FavoritosService.add() → tipo 'favorito_agregado' (low priority)
```

#### Canal Dual — Email (Resend) + In-App

**Configuración Resend (NUEVA - documentar en `deploy-standards.md`):**
```env
# backend/.env
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@directorio-concon.com
EMAIL_REPLY_TO=soporte@directorio-concon.com
```

**Templates de Email (REQUERIDOS - crear en `backend/src/modules/notificaciones/templates/`):**

| Template | Variables | Asunto |
|----------|-----------|--------|
| `place-verificado.hbs` | `{{nombrePlace}}`, `{{urlPlace}}` | "Tu lugar ha sido verificado ✓" |
| `place-rechazado.hbs` | `{{nombrePlace}}`, `{{motivo}}`, `{{urlPanel}}` | "Tu lugar requiere correcciones" |
| `reclamo-aprobado.hbs` | `{{nombrePlace}}`, `{{urlPanel}}` | "Reclamo aprobado: ahora gestionas este lugar" |
| `reclamo-rechazado.hbs` | `{{nombrePlace}}`, `{{motivo}}` | "Reclamo rechazado" |
| `evento-verificado.hbs` | `{{nombreEvento}}`, `{{urlEvento}}` | "Tu evento ha sido verificado ✓" |
| `evento-rechazado.hbs` | `{{nombreEvento}}`, `{{motivo}}`, `{{urlPanel}}` | "Tu evento requiere correcciones" |
| `evento-revertido-pendiente.hbs` | `{{nombreEvento}}`, `{{campoModificado}}`, `{{urlAdmin}}` | "[Admin] Evento verificado revertido a pendiente" |

**Servicio de Email (async, fire-and-forget, no bloquea write):**
```typescript
// backend/src/modules/notificaciones/infrastructure/email.resend.service.ts
@Injectable()
export class EmailService {
  async send(to: string, template: string, data: Record<string, any>): Promise<void> {
    try {
      const html = await this.renderTemplate(template, data);
      await this.resend.emails.send({from: process.env.EMAIL_FROM, to, subject: this.getSubject(template), html});
    } catch (e) {
      this.logger.error('Email send failed', e); // Log pero no throw
    }
  }
}
```

#### Testing Requerido (CH-06)

| Tipo | Qué testear |
|------|-------------|
| Unit | `NotificacionesService.create`, `markAsRead`, `getCount`, `EmailService.renderTemplate`, `EmailService.send` (mock Resend) |
| Integration | `NotificacionesFirestoreAdapter`, triggers desde `PlacesService`, `EventosService`, `SolicitudesService` |
| E2E | Flujo completo: owner crea place → admin verifica → notificación in-app + email recibido; admin rechaza → email con motivo; edición evento verificado → notifica admin |

#### OpenSpec Artifacts

```
openspec/changes/2026-XX-XX-notificaciones/
  requirements.md      // Colección, endpoints, disparadores, templates email, canal dual
  scenarios.md         // Gherkin: 12+ scenarios
  tasks.md             // 20-25 tasks
```

---

### CH-07: favoritos — Flow 4 (member)

#### Colección `favoritos` (top-level)

```typescript
// backend/src/modules/favoritos/domain/favorito.entity.ts
interface Favorito {
  id: string;              // `${usuarioId}_${placeId}` o auto
  usuarioId: string;
  placeId: string;
  createdAt: Timestamp;
}
```

#### Endpoints (cualquier rol autenticado — `@Roles('admin','owner','member')` + `EmailVerifiedGuard`)

| Método | Path | Body | Validaciones |
|--------|------|------|--------------|
| POST | `/api/v1/favoritos` | `{placeId: string}` | place existe + `activo: true`, no duplicado (unique index), **límite 50 por usuario** |
| DELETE | `/api/v1/favoritos/:placeId` | — | Debe existir favorito del usuario |
| GET | `/api/v1/favoritos/me?page=1&limit=20` | — | Lista con `placeId` + opcional populate datos place (query param `populate=true`) |

#### Índice Firestore

```json
{
  "collectionGroup": "favoritos",
  "fields": [
    {"fieldPath": "usuarioId", "order": "ASCENDING"},
    {"fieldPath": "placeId", "order": "ASCENDING"}
  ]
}
// Unique constraint: usuarioId + placeId (enforce en service + transacción)
```

#### Mejora Panel Owner (en `UsuariosService.getMe()`)

```typescript
async getMe(uid: string): Promise<Usuario & {placesCount: number, eventosCount: number, notificacionesNoLeidas: number}> {
  const usuario = await this.repo.findById(uid);
  const [placesCount, eventosCount, notifCount] = await Promise.all([
    this.placesRepo.countByUsuarioId(uid),
    this.eventosRepo.countByUsuarioId(uid),
    this.notificacionesRepo.countUnread(uid)
  ]);
  return {...usuario, placesCount, eventosCount, notificacionesNoLeidas: notifCount};
}
```

#### Testing Requerido (CH-07)

| Tipo | Qué testear |
|------|-------------|
| Unit | `FavoritosService.add` (límite 50, duplicado, place inactivo), `remove`, `list` |
| Integration | `FavoritosFirestoreAdapter` (unique constraint, count) |
| E2E | Member agrega favorito → badge contador en header → lista en perfil → elimina → contador baja; límite 50 bloquea 51° |

#### OpenSpec Artifacts

```
openspec/changes/2026-XX-XX-favoritos/
  requirements.md      // Colección, endpoints, límite 50, mejora panel owner
  scenarios.md         // Gherkin: 8+ scenarios
  tasks.md             // 12-15 tasks
```

---

## PHASE 3 — FRONTEND

### CH-08: frontend-mvp-v2 — Todas las pantallas MVP actualizadas

#### Stack UI por Área

| Área | Tecnología | Design System |
|------|------------|---------------|
| Sitio público (home, directorio, place detail, mapa, auth, eventos público) | TailwindCSS v3 + lucide-angular + ngx-skeleton-loader | "Dunas y Océano" (docs/DESIGN.md) |
| Panel Owner (`/mi-panel`) | TailwindCSS v3 + Angular Material (solo components: table, tabs, dialog, snackbar) | Híbrido: layout Tailwind, data tables Material |
| Panel Admin (colas verificación, reclamos) | **Angular Material completo** (table, paginator, sort, dialog, form-field, select, button, icon, snackbar, badge) | Material theme con Ocean Blue (#004370) primary |

#### Pantallas Detalladas

##### 1. Auth Flow

| Componente | Ruta | Detalles |
|------------|------|----------|
| `RegisterPageComponent` | `/registrarse` | Reactive Form: email, password, confirmPassword, nombre, rol (radio: member/owner). Submit → `AuthService.register()` → Firebase Auth → redirect `/verificar-email` |
| `LoginPageComponent` | `/login` | Reactive Form: email, password, rememberMe. Google Sign-In button. Error 403 emailVerified → alert + botón "Reenviar" → `AuthService.resendVerification()` |
| `EmailVerificationPageComponent` | `/verificar-email` | Polling cada 30s `AuthService.checkEmailVerified()` → si true: redirect `/mi-panel` (owner) o `/` (member). Botón "Reenviar" |
| `AuthGuard` (rutas) | — | `canActivate`: verifica `AuthService.isLoggedIn()` + `AuthService.isEmailVerified()` → redirect `/login` o `/verificar-email` |

##### 2. Owner Panel (`/mi-panel`)

```typescript
// Layout: Sidebar nav + content area
// Dashboard cards (3): Registrar Place, Publicar Evento, Editar Perfil
// Tabs: Mis Places | Mis Eventos | Notificaciones
```

| Sección | Componentes | Datos |
|---------|-------------|-------|
| Header | `OwnerHeaderComponent` | Avatar, nombre, badge rol, campana notificaciones (badge count) |
| Dashboard | `OwnerDashboardComponent` | `GET /usuarios/me` extendido → placesCount, eventosCount, notificacionesNoLeidas |
| Mis Places | `OwnerPlacesListComponent` | `GET /places?usuarioId=me` → tabla con badges `estadoVerificacion`, acciones: Editar, Ver Reclamos, Solicitar Verificación (si pendiente) |
| Mis Eventos | `OwnerEventosListComponent` | `GET /eventos?usuarioId=me` → tabla con badges, acciones: Editar, Ver Detalle |
| Notificaciones | `NotificacionesCenterComponent` | `GET /notificaciones/me` → lista con mark-as-read, empty state |

##### 3. Place Detail (`/place/{slug}`) — **CRÍTICO FALTANTE**

```html
<!-- Estructura visual per docs/perfil/code.html -->
<header class="place-hero">Imagen portada + badge estadoVerificacion + nombre + categoria/barrio</header>
<mat-tab-group>
  <mat-tab label="Info">Descripción, horarios (con badge "Abierto ahora"), servicios, pagos, redes, contacto</mat-tab>
  <mat-tab label="Galería">Grid imágenes + lightbox</mat-tab>
  <mat-tab label="Mapa">Google Maps marker + direcciones</mat-tab>
  <mat-tab label="Contacto">Formulario contacto (email/WhatsApp), botón "Compartir"</mat-tab>
</mat-tab-group>
<!-- Si owner del place: floating action buttons → Editar, Solicitar Verificación, Ver Reclamos -->
```

- **Skeleton loaders** en todo (hero, tabs, mapa)
- **Responsive:** mobile-first, breakpoints per DESIGN.md

##### 4. Directorio Listing (`/directorio`)

```html
<!-- Layout: Sidebar filtros (mobile: drawer) + Grid principal -->
<aside class="filtros">
  <input type="search" placeholder="Buscar lugares...">
  <mat-select placeholder="Categoría" [matOptgroup] subcategorías anidadas>
  <mat-select placeholder="Barrio">
  <button>Limpiar filtros</button>
</aside>
<main class="grid">
  <app-place-card *ngFor="let place of places" [place]="place"></app-place-card>
  <!-- place-card: imagen, nombre, categoria, barrio, badge estadoVerificacion, chip "Abierto ahora" -->
</main>
<button *ngIf="hasMore" (click)="loadMore()">Cargar más</button>
<app-empty-state *ngIf="places.length === 0"></app-empty-state>
```

##### 5. Mapa Places (`/mapa`)

- `GoogleMap` + markers por `GET /places/map-data`
- Clustering si >50 markers
- Click marker → `MatBottomSheet` con nombre, categoria, barrio, botón "Ver ficha"

##### 6. Eventos (Actualizaciones)

- **Formulario creación/edición:** Eliminar selector `placeId`. Agregar `UbicacionComponent` (nombre lugar, dirección, `GoogleMap` picker para coordenadas)
- **Listado/Detail/Mapa:** Badge `estadoVerificacion` igual que places

##### 7. Admin Panels (Angular Material)

| Panel | Ruta | Tabla + Acciones |
|-------|------|------------------|
| Verificación Places | `/admin/places/verificacion` | `GET /places?estadoVerificacion=pendiente` → columns: nombre, owner, fechaCreación, acciones: Verificar/Rechazar (dialog con motivo required si rechaza) |
| Verificación Eventos | `/admin/eventos/verificacion` | Igual |
| Reclamos | `/admin/reclamos` | `GET /solicitudes?status=pendiente` → columns: place, solicitante, fecha, acciones: Aprobar/Rechazar |

#### Testing Requerido (CH-08)

| Tipo | Herramienta | Qué testear |
|------|-------------|-------------|
| Unit | Jasmine/Karma | Components puros (presentational), pipes, utils |
| Integration | Jasmine/Karma | Smart components + services (mock HTTP), guards, resolvers |
| E2E | **Cypress** (recomendado) / Playwright | Flujos críticos: registro→verificación→crear place→ver badge; login owner→panel→crear place→reclamar; admin→verificar place→email; directorio filtros→grid; place detail tabs; mapa markers |

#### OpenSpec Artifacts

```
openspec/changes/2026-XX-XX-frontend-mvp-v2/
  requirements.md      // Pantallas, componentes, UI kits, guards, flujos
  scenarios.md         // Gherkin: 25+ scenarios (auth, owner panel, place detail, directorio, mapa, eventos, admin)
  tasks.md             // 60-70 tasks
```

---

## BREAKING CHANGES & MIGRACIONES (Checklist Consolidado)

| Change | Script Migración | Campos Eliminados | Campos Nuevos | Índices Actualizados |
|--------|------------------|-------------------|---------------|---------------------|
| CH-01 | `audit-cat-barrio-refs.ts` + `seed.ts` | — | categorias.activo, subcategorias[].activo, barrios.activo | categorias:activa+orden, barrios:tipo |
| CH-02 | — | usuarios.placeId, POST /usuarios | usuarios.emailVerified, AuthContext.emailVerified | usuarios:emailVerified (opcional) |
| CH-03 | `migrate-places-verificacion.ts` | places.status, places.verificado, places.fechaVerificacion | places.activo, places.estadoVerificacion, places.motivoRechazoVerificacion, places.gestionadoPorAdmin | places:activo+..., solicitudes:placeId+status |
| CH-04 | `migrate-eventos-verificacion.ts` | eventos.status, eventos.placeId, solicitudes tipos evento | eventos.activo, eventos.estadoVerificacion, eventos.motivoRechazoVerificacion, eventos.ubicacion, eventos.cambios[] | eventos:activo+..., eventos:estadoVerificacion+... |
| CH-05 | `migrate-solicitudes.ts` | solicitudes.eventoId, solicitudes.proposal, 4 tipos | solicitudes.solicitanteUid (required) | — |
| CH-06 | — | — | notificaciones (colección nueva) | notificaciones:usuarioId+leida+createdAt |
| CH-07 | — | — | favoritos (colección nueva) | favoritos:usuarioId+placeId (unique) |
| CH-08 | — | — | — | — |

---

## ORDEN DE EJECUCIÓN SDD (Comandos Exactos)

```bash
# ==========================================
# PHASE 0 - FOUNDATION (PARALELOS)
# ==========================================
/plan-change categorias-barrios-crud
/plan-change auth-usuarios-v2

# Esperar /apply + /verify + /archive de AMBOS antes de continuar

# ==========================================
# PHASE 1 - CORE DOMAIN (PARALELOS places + eventos, luego solicitudes)
# ==========================================
/plan-change places-refactor
/plan-change eventos-refactor

# Esperar ambos archivados
/plan-change solicitudes-refactor

# ==========================================
# PHASE 2 - CROSS-CUTTING (PARALELOS)
# ==========================================
/plan-change notificaciones
/plan-change favoritos

# ==========================================
# PHASE 3 - FRONTEND
# ==========================================
/plan-change frontend-mvp-v2
```

---

## CRITERIOS DE ACEPTACIÓN GLOBALES (Definition of Done por Change)

- [ ] **OpenSpec artifacts** generados: `requirements.md`, `scenarios.md`, `tasks.md` en `openspec/changes/.../`
- [ ] **TDD estricto:** Tests escritos ANTES que código (unit + integration + e2e)
- [ ] **Cobertura:** Backend ≥90% (unit+integration), E2E 100% happy paths; Frontend ≥80% unit, E2E flujos críticos
- [ ] **Solid-lint:** `make solid-lint` pasa sin violations (max-lines, complexity, DIP, ISP)
- [ ] **Types:** Zero `any` en código producción (solo test mocks)
- [ ] **Docs actualizados:** `data-model.md`, `api-spec.yml`, `backend-standards.md`, `frontend-standards.md`, `deploy-standards.md` (si aplica)
- [ ] **Migración probada:** Scripts one-time ejecutados en emulador Firestore + staging
- [ ] **Deploy:** Docker build pasa, healthcheck ok, smoke tests E2E contra staging
- [ ] **Archive:** `/archive <change-id>` completa con checkboxes en tasks.md

---

## RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Migración places/eventos rompe datos existentes | Alta | Alto | Scripts idempotentes, dry-run en emulador, backup Firestore antes de staging |
| Email Resend no configurado a tiempo para CH-06 | Media | Medio | Mock email service en desarrollo; templates listos; configurar Resend en paralelo |
| Angular Material + Tailwind conflicts en panel owner | Baja | Medio | Aislar Material en `OwnerPanelModule` con `MatNativeDateModule`, usar `::ng-deep` mínimo |
| Performance `GET /favoritos/me` con populate N+1 | Media | Medio | Implementar `populate=true` opcional; default solo IDs; batch read places en service |
| Reglas de verificación (reversión auto) confunden a admins | Media | Bajo | Historial `cambios[]` visible en admin panel; notificación diferenciada a admin |

---

## PRÓXIMOS PASOS INMEDIATOS

1. **Ejecutar `/plan-change categorias-barrios-crud`** → genera OpenSpec artifacts CH-01
2. **Ejecutar `/plan-change auth-usuarios-v2`** → genera OpenSpec artifacts CH-02
3. Revisar artifacts generados, ajustar si necesario
4. `/apply` en paralelo (dos worktrees git si disponible)
5. `/verify` + `/archive` ambos
6. Continuar con Phase 1

---

*Documento actualizado con respuestas de validación 2026-07-31. Listo para generar changes OpenSpec robustos.*
