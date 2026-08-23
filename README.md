# Directorio de Empresas de Concón

Plataforma web para descubrir y gestionar negocios locales en Concón, Chile: directorio
empresarial con búsqueda, mapa, perfiles y panel de administración.

## Stack

- **Backend**: NestJS 10 + TypeScript 5, Firebase (Firestore, Auth, Storage).
- **Frontend** (futuro): Angular 17+ + TailwindCSS.
- **Deploy**: VPS con Docker (Docker Compose + Nginx/Caddy para TLS).

## Estructura (monorepo)

```
Directorio/
├── backend/          # API NestJS (fuente de verdad del backend)
│   ├── Dockerfile
│   └── docker-compose.prod.yml
├── ai-specs/         # Agentes y skills de OpenCode (NO editar)
├── docs/             # Estándares SDD + api-spec.yml + data-model.md
├── .github/          # CI/CD (ci.yml, deploy.yml) + instrucciones
├── AGENTS.md         # Instrucciones de OpenCode
├── opencode.json     # Comandos SDD (/plan-change, /apply, ...)
└── Makefile          # Interface CI stack-agnostic (make lint/test/build/audit)
```

## Desarrollo con Spec-Driven Development (SDD)

Este proyecto usa [Specboot](https://github.com/GabrielZavando/Specboot): especificaciones
(OpenSpec) antes de código.

```bash
npm i -g @fission-ai/openspec   # una vez
openspec init                    # inicializar .openspec/

# Ciclo por feature (desde OpenCode):
/enrich-us TICKET-ID             # (opcional) refinar ticket vago
/plan-change TICKET-ID           # genera specs + tasks
/apply TICKET-ID                 # implementa (TDD, una task a la vez)
/verify TICKET-ID                # valida contra escenarios
/archive TICKET-ID               # archiva el cambio
/commit                          # commits convencionales + PR
/deploy                         # release VPS/Docker
```

Documentación canónica: `docs/base-standards.md`, `docs/backend-standards.md`,
`docs/data-model.md`, `docs/api-spec.yml`, `docs/deploy-standards.md`.

## Backend — quick start

```bash
cd backend
npm install
cp .env.example .env            # completar credenciales Firebase
npm run seed                    # poblar catálogo (categorias/barrios) + datos mock (places/eventos)
npm run audit-refs              # verificar que places/eventos referencien catálogo válido
npm run start:dev               # http://localhost:3000/api/v1  (docs: /api/docs)
```

## Build & Deploy (VPS)

```bash
cd backend
docker build -t directorio-concon-api:production .
docker compose -f docker-compose.prod.yml up -d
curl -f http://localhost:3000/api/v1/health
```

Ver `docs/deploy-standards.md` para el flujo completo (staging → producción, rollback).

## Convenciones

- Conventional Commits (`feat:`, `fix:`, `docs:`...), validados con commitlint.
- Código en inglés, documentación cliente en español.
- TDD: test fallido antes de producción. Cobertura objetivo backend ≥ 90%.

## CI

GitHub Actions: `make lint` → `make test` → `make build` → `make audit` → commitlint.
Deploy en tags `v*.*.*` vía `docker compose` al VPS.
