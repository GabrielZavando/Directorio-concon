# Auditoría Integral — Directorio de Empresas de Concón

**Fecha:** 31 de julio de 2026  
**Rama actual:** `feature/auth-usuarios` (mal nombrada — change ya archivado)  
**Commit HEAD:** `a528693` — chore(openspec): mark /commit checkbox complete

---

## Resumen Ejecutivo

El proyecto es un **Directorio de Empresas de Concón** (Chile) construido con arquitectura **Spec-Driven Development (SDD)** usando **OpenSpec** como fuente de verdad. Stack: **NestJS 11 + TypeScript + Firebase (Firestore, Auth, Storage)** en backend; **Angular 20 standalone + TailwindCSS v3 + Firebase Web SDK** en frontend. Design system canónico: **"Dunas y Océano"** (docs/DESIGN.md).

**Estado actual:** MVP parcial — módulos `auth`, `usuarios`, `places`, `eventos`, `solicitudes` implementados en backend; frontend tiene shell SPA + feature completa de `eventos` + home hero; **faltan 3 de 4 pantallas MVP** (perfil/place-detail, auth/login, directorio listing) y módulos `categorias`/`barrios` en backend.

**Plan validado:** 8 changes OpenSpec en 4 phases (ver `PLAN_IMPLEMENTACION.md`)

---

## 1. Hallazgos Críticos (Bloqueantes)

| # | Área | Hallazgo | Archivo/Evidencia | Impacto |
|---|------|----------|-------------------|---------|
| **1** | Backend | **DIP violation**: `AuthService` (application) importa `firebase-admin/auth` | `backend/src/modules/auth/application/auth.service.ts:34` | Rompe Clean Architecture; dificulta testing y swap de infra |
| **2** | Backend | **Script `seed` inexistente** — `backend/scripts/` no existe | `backend/package.json` lines 23-24 (`seed`, `migrate` apuntan a archivos fantasmas) | MVP no puede poblar `categorias`/`barrios` en Firestore |
| **3** | Backend | **5 archivos >300 líneas** (máx 427) | `evento-firestore.adapter.ts:427`, `places.service.ts:358`, `place-firestore.adapter.ts:338`, `firebase.service.ts:324`, `eventos.service.ts:306` | Excede umbrales CI `solid-lint` (max-lines: 300) |
| **4** | Frontend | **Pantalla Ficha de Place (perfil) NO implementada** | `docs/perfil/code.html` existe; no hay componente `place-detail`/`place-ficha` | 1 de 4 pantallas MVP del design system faltante |
| **5** | Frontend | **API Base URL mismatch** | `frontend-standards.md:117` dice `https://api.directorio-concon.com/api`; `api-spec.yml:14` usa `/api/v1`; `EventosService` usa `/api/v1/eventos`; `environment.ts` sin `apiBase` | Llamadas API fallarán en dev/prod; proxy no configurado |
| **6** | OpenSpec | **Rama `feature/auth-usuarios` mal nombrada** — change archivado en `f46d0cb` | `git log --oneline` + `openspec/changes/archive/2026-07-31-auth-usuarios/` | Confusión en workflow SDD; próximo trabajo indefinido |
| **7** | OpenSpec | **Módulos `categorias`/`barrios` ausentes en backend** | `backend/src/modules/` solo tiene auth, eventos, places, solicitudes, usuarios; `app.module.ts:16-17` comentados | Gap de MVP: catálogos no persistibles ni administrables vía API |

---

## 2. Hallazgos Importantes (Media Severidad)

| # | Área | Hallazgo |
|---|------|----------|
| 8 | Backend | **Sin tests E2E** para places, eventos, usuarios, solicitudes (solo auth en `backend/test/auth-canonical-scenarios.spec.ts`) |
| 9 | Backend | **Endpoints `solicitudes` list/filtrado faltantes** — solo `approve`/`reject` existen (AGENTS.md confirma pendiente) |
| 10 | Frontend | **Auth/Register es solo skeleton** — `RegistratePageComponent` sin formulario real ni Firebase Auth |
| 11 | Frontend | **Border radius tokens en `tailwind.config.js` difieren de `docs/DESIGN.md`** — DESIGN.md: `DEFAULT: 0.5rem, md: 0.75rem, lg: 1rem, xl: 1.5rem`; tailwind: `DEFAULT: 0.25rem, lg: 0.5rem, xl: 0.75rem` |
| 12 | Frontend | **Un `as any` en código producción** — `eventos-list-page.component.ts:240` |
| 13 | Frontend | **Faltan scripts `lint`, `test:coverage` en `package.json`** |
| 14 | OpenSpec | **`api-spec.yml`: `CreateEvento.subcategoriaId` sin enum de 10 valores** — validación solo en backend (`EventoValidator`) |
| 15 | OpenSpec | **README.md desactualizado** — NestJS 10→11, Angular 17→20, frontend "futuro" ya existe |
| 16 | OpenSpec | **CHANGELOG.md solo trackea template, no cambios del proyecto** |

---

## 3. Puntos Fuertes (Cumplimiento Estándares)

| Área | Lo que está bien |
|------|------------------|
| **Backend** | Clean Architecture por feature en todos los módulos implementados (`domain/` + `application/` + `infrastructure/`) |
| **Backend** | Auth wiring completo: `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`, `AuthContext` en **todos** endpoints protegidos |
| **Backend** | Global `ValidationPipe` con `whitelist: true` + `forbidNonWhitelisted: true` |
| **Backend** | XOR `placeId`/`eventoId` en `SolicitudesService` + delete 409 con solicitudes pendientes (places + eventos) |
| **Backend** | Swagger `/api/docs` dev-only; Firestore indexes **100% sincronizados** con data-model.md (24 índices compuestos) |
| **Backend** | CI `solid-lint` configurado (ESLint thresholds + dependency-cruiser + madge) |
| **Frontend** | Standalone + OnPush + Lazy loading en toda la app |
| **Frontend** | Smart/Dumb separation correcta — `HttpClient` solo en `EventosService` (data-access) |
| **Frontend** | Design tokens completos en Tailwind (colores Material 3, fuentes Montserrat/Inter, sombras con tint Ocean Blue) |
| **Frontend** | `lucide-angular` + `ngx-skeleton-loader` + `@angular/google-maps` integrados y usados |
| **Frontend** | Seed data `categorias.json`/`barrios.json` coinciden **exactamente** con data-model.md (10 categorías, 13 barrios: 12 urban + 1 rural) |
| **OpenSpec** | 4 changes archivados (`eventos-crud`, `roles-rename`, `auth-usuarios`, `places-auth-fix`) reflejados en specs canónicos |
| **OpenSpec** | `check-refs.sh` pasa — **0 errores** de integridad referencial |
| **OpenSpec** | Deploy standards + `Dockerfile` + `docker-compose.prod.yml` presentes (VPS + Nginx) |

---

## 4. Plan de Acción Validado (8 Changes / 4 Phases)

### Phase 0 — Foundation (Paralelos)
| Change | Alcance | Decisiones Clave |
|--------|---------|------------------|
| **CH-01: categorias-barrios-crud** | Módulos Clean Arch + seed + endpoints admin/públicos + validación cruzada | Datos mock/inventados para places/eventos; seed desde JSONs; Google Places API post-MVP |
| **CH-02: auth-usuarios-v2** | Self-registration con rol selection, email verification obligatoria, elimina provisioning admin | Firebase Auth Email/Password + Google; Resend no configurado (templates en CH-06) |

### Phase 1 — Core Domain Refactor
| Change | Alcance | Decisiones Clave |
|--------|---------|------------------|
| **CH-03: places-refactor** | Nuevo modelo `activo` + `estadoVerificacion`, claiming, verificación admin, badges públicos | Publicación inmediata; `status`→`activo`+`estadoVerificacion`; migración one-time |
| **CH-04: eventos-refactor** | `ubicacion` reemplaza `placeId`, verificación, edición revierte `verificado`→`pendiente` | Sin regla de congelación (post-MVP); historial `cambios[]` embebido; notifica admin en reversión |
| **CH-05: solicitudes-refactor** | Solo `reclamo-place`; auto-rechaza otros al aprobar | Limpieza 4 tipos obsoletos |

### Phase 2 — Cross-Cutting (Paralelos)
| Change | Alcance | Decisiones Clave |
|--------|---------|------------------|
| **CH-06: notificaciones** | Colección + endpoints + triggers + **templates email Resend** + canal dual | Resend config + 7 templates Handlebars requeridos; async fire-and-forget |
| **CH-07: favoritos** | Colección top-level + endpoints + límite 50 + mejora panel owner | Límite 50 confirmado; panel owner con contadores agregados |

### Phase 3 — Frontend
| Change | Alcance | Decisiones Clave |
|--------|---------|------------------|
| **CH-08: frontend-mvp-v2** | Auth flow, Owner panel, Place Detail (crítico), Directorio, Mapas, Admin queues | Admin UI = Angular Material; Sitio público = Design System "Dunas y Océano"; E2E con Cypress |

---

## 5. Breaking Changes & Migraciones (Resumen)

| Área | Breaking Change | Migración Requerida |
|------|-----------------|---------------------|
| `places` | `status` → `activo` + `estadoVerificacion` | Script one-time: mapear status→activo, verificado→estadoVerificacion |
| `eventos` | `status` → `activo` + `estadoVerificacion`, `placeId` → `ubicacion` | Script one-time: mapear + construir ubicacion desde placeId si existía |
| `solicitudes` | 5 tipos → 1 tipo (`reclamo-place`) | Eliminar docs tipos obsoletos |
| `usuarios` | Eliminar `placeId`, eliminar `POST /usuarios` | Sin migración datos (colección se recrea via auth) |
| `categorias`/`barrios` | JSON local → Colecciones Firestore | Seed script + auditoría referencias existentes |
| Auth | Self-registration + email verification obligatorio | Usuarios existentes: marcar `emailVerified: true` manualmente o forzar re-verificación |

---

## 6. Testing Strategy (Obligatorio por Change)

| Tipo | Backend | Frontend |
|------|---------|----------|
| **Unit** | Jest — Services, Validators, Guards (cobertura ≥90%) | Jasmine/Karma — Components puros, pipes, utils (≥80%) |
| **Integration** | Jest + Supertest + Firestore Emulator — Adapters, Repositories | Jasmine/Karma — Smart components + services mock HTTP |
| **E2E** | Jest + Supertest — Flujos críticos completos (registro→verificación→crear→reclamar→verificar) | **Cypress** — Flujos críticos usuario (auth, owner panel, place detail, directorio, admin queues) |

---

## 7. Próximos Pasos Inmediatos

```bash
# 1. Generar specs Phase 0 (paralelos)
/plan-change categorias-barrios-crud
/plan-change auth-usuarios-v2

# 2. Revisar artifacts generados en openspec/changes/.../
# 3. Implementar con /apply (worktrees git recomendado)
# 4. Verificar con /verify + /archive ambos
# 5. Continuar Phase 1
```

---

## 8. Métricas de Cumplimiento (Objetivo vs Actual)

| Métrica | Backend Objetivo | Backend Actual | Frontend Objetivo | Frontend Actual |
|---------|------------------|----------------|-------------------|-----------------|
| Cobertura tests | 90% | ~40% (unit) / 0% (e2e) | 80% | ~20% (unit) / 0% (e2e) |
| Max lines/archivo | 300 | **5 archivos >300** | 400 | OK (max 351) |
| Cyclomatic complexity | ≤10 | Pendiente medir | ≤10 | Pendiente medir |
| `any` en prod | 0 | 1 (type cast Timestamp) | 0 | **1** (`eventos-list-page.ts:240`) |
| DIP violations | 0 | **1** (`AuthService`) | 0 | 0 |
| Hardcoded colors | 0 | 0 | 0 | **1** intencional (gradient hero) |

---

*Documento actualizado con decisiones validadas 2026-07-31. Ver `PLAN_IMPLEMENTACION.md` para especificación técnica completa de los 8 changes.*
