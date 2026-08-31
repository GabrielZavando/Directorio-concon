# Stack técnico

> Contexto del proyecto (propiedad del dev). Migrado desde `docs/base-standards.md` §8.1
> durante la migración a `@gabrielzavando/specboot` como paquete npm.

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
Lenguaje código: English | Documentación cliente: Español
Monorepo:     backend/ + frontend/
Arquitectura BE: Clean Architecture por feature
                backend/src/modules/<feature>/{domain, application, infrastructure}
                (ver docs/backend-standards.md Principios de Diseño — Backend)
```

## Framework de desarrollo

- **Specboot** (`@gabrielzavando/specboot`, GitHub Packages) — framework SDD sobre OpenCode + OpenSpec.
  Configuración en `.specboot.json` (raíces de servicios, stack, estándares extra).
  Actualización del framework: `npm install` (con token en `~/.npmrc`) + `specboot update`.

## Umbrales SOLID (referencia cruzada)

Los umbrales medibles por linter en CI viven en los estándares por stack:
- `docs/backend-standards.md` — §Umbrales objetivos (max-lines 300, complexity ≤10, max-params ≤3)
- `docs/frontend-standards.md` — §Umbrales (max-lines 400)
- Herramientas y configs: `templates/ci/` y `docs/ci-standards.md`
