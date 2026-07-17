# Deploy Standards — Directorio Concón

> Despliegue objetivo del proyecto: **VPS propio con Docker**. Sustituye el flujo
> Railway/Cloud Run/Firebase Hosting descrito en `.github/instructions/deployment-instructions.md`
> (mantenido por histórico, pero no es la fuente de verdad de deploy).

## Environments

- `staging`: entorno de pruebas en el VPS (mismo host, contenedor `:staging` o subdominio `staging.*`).
- `production`: contenedor `:production` expenciado vía reverse proxy (Nginx/Caddy) con TLS.
- Promoción manual tras smoke tests verdes en staging.

## Pre-deploy Checklist

- `make lint` y `make test` pasan (corren sobre `backend/`).
- `make build` compila (`nest build`).
- `npm audit --audit-level=high` sin vulnerabilidades críticas.
- Índices Firestore creados en el proyecto Firebase de producción.
- Variables de entorno de producción cargadas en `.env` del VPS (nunca en git).

**Exit criteria:** todo lo anterior pasa. Si algo falla, se corrige antes de continuar.

## Versioning

- SemVer `MAJOR.MINOR.PATCH` sobre `backend/package.json`.
- Bump vía `bash update.sh --bump <patch|minor|major>` (crea tag `vX.Y.Z` + entrada CHANGELOG).
- El tag produce imagen Docker `directorio-concon-api:vX.Y.Z` y `:production` (mutable).

## Build & Registry

- Imagen local en el VPS (no se usa registry externo por defecto; opcionalmente GHCR).
- `docker build -t directorio-concon-api:vX.Y.Z -f backend/Dockerfile backend/`.
- Dockerfile multi-stage (builder `node:22-alpine` → runtime `node:22-alpine` slim).

## Deploy Flow (VPS + Docker Compose)

1. `git pull` de `main` en el VPS (o `scp`/pipeline).
2. `docker compose -f docker-compose.prod.yml build api`
3. `docker compose -f docker-compose.prod.yml up -d api`
4. Esperar ~15s y correr smoke tests (health + endpoints clave).
5. Si falla → `docker compose -f docker-compose.prod.yml up -d api` con tag previo (rollback).
6. Solo tras smoke tests verdes en staging, promover a production.

### Estructura esperada en el VPS

```
/opt/directorio-concon/
  docker-compose.prod.yml
  .env                      # secrets (Firebase, CORS, Redis) — 600, fuera de git
  backend/
    dist/                   # build montado o copiado
```

### Reverse Proxy (Nginx/Caddy) — recomendado

- Terminar TLS y redirigir `/api/*` al contenedor `api:3000`.
- Health check en `GET /api/v1/health`.
- Rate limiting a nivel proxy como defensa extra (NestJS ya aplica throttler).

## Smoke Tests

- Health: `GET /api/v1/health` → 200 `{ status: 'ok' }`.
- Endpoints clave por entorno (ej. `GET /api/v1/empresas?limit=1` tras auth en staging).
- Script: `curl -fsS https://api.directorio-concon.com/api/v1/health`.

## Rollback

- Tag previo: `docker compose -f docker-compose.prod.yml up -d api` con `image: directorio-concon-api:vX.Y.(Z-1)`.
- O `docker tag` + `up -d`. Verificar health tras rollback.

## Notifications

- Webhook Slack/Discord opcional en `SLACK_WEBHOOK_URL`.
- GitHub Release con notas generadas en `/deploy`.

## Environment Variables (VPS)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno | `production` |
| `PORT` | Puerto interno del contenedor | `3000` |
| `FIREBASE_PROJECT_ID` | ID proyecto Firebase | `directorio-concon` |
| `FIREBASE_PRIVATE_KEY` | Clave privada service account (con `\n`) | `-----BEGIN...` |
| `FIREBASE_CLIENT_EMAIL` | Email service account | `firebase-adminsdk@...` |
| `FIREBASE_STORAGE_BUCKET` | Bucket Storage | `directorio-concon.appspot.com` |
| `CORS_ORIGINS` | Orígenes permitidos (coma) | `https://directorio-concon.com` |
| `REDIS_URL` | Cache (opcional) | `redis://redis:6379` |

## Project-specific stack

```
Runtime: Node.js 22 (alpine)
Container: Docker (multi-stage) + Docker Compose
Orchestration: Docker Compose en VPS (systemd para keep-alive)
Registry: local / GHCR opcional
Smoke tests: curl /api/v1/health
Rollback: docker compose con tag previo
```
