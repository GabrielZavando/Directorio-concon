# Scripts de mantenimiento del backend

Scripts TypeScript ejecutables con `ts-node` (o `npx ts-node`). Requieren credenciales Firebase válidas en `.env` (o variables de entorno equivalentes).

## Comandos disponibles (npm)

| Script | Acción |
|--------|--------|
| `npm run seed` | Puebla `categorias` y `barrios` desde los JSON canónicos del frontend, luego puebla `places`/`eventos` con datos mock. Idempotente (usa `set(merge:true)` keyed by slug). |
| `npm run seed:cat` | Solo seedea `categorias` + `barrios` (sin places/eventos mock). Útil cuando ya tienes datos de places reales. |
| `npm run seed:places` | Solo seedea `places` + `eventos` mock. Útil para tests E2E contra un catálogo ya cargado. |
| `npm run audit-refs` | Escanea `places` y `eventos`, valida que cada `categoriaId`/`subcategoriaId`/`barrioId` resuelva a un doc existente en los catálogos. Imprime `{ validos, huerfanos }`. Exit code `0` si no hay huérfanos, `1` si los hay. Usar antes de activar `CATALOG_VALIDATION_ENABLED=true` en staging/prod. |
| `npm run migrate:places` | Migración idempotente de `places` al modelo de verificación (CH-03): reemplaza `status`+`verificado` por `activo`+`estadoVerificacion`+`gestionadoPorAdmin`. Puede ejecutarse varias veces de forma segura (salta docs ya migrados). |

## Uso en local

```bash
# 1. Levantar el emulador de Firestore (en otra terminal)
firebase emulators:start --only firestore

# 2. Configurar .env apuntando al emulador
# (FIREBASE_PROJECT_ID=directorioconcon y FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080)

# 3. Ejecutar seed
cd backend
npm run seed
```

## Uso en staging

```bash
# Cargar credenciales de staging
gcloud secrets versions access latest --secret=firebase-admin-staging > firebase-admin.json
export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/firebase-admin.json

# Audit antes de cambios
npm run audit-refs   # debe mostrar 0 huérfanos

# Seed (solo categorías nuevas; los places/eventos reales no se sobrescriben por slug-key)
npm run seed:cat
```

## Conflictos de slugs en producción

El seed escribe **keyed by slug** (`set(merge:true)` sobre `categorias/{slug}` y `barrios/{slug}`). Si en producción existe un doc cuyo `slug` coincide con uno del JSON canónico, el seed lo **actualiza en el lugar** (merge) — no crea un duplicado ni borra el doc existente.

- Si el conflicto es de **datos** (el doc real tiene un `slug` igual pero contenido distinto al JSON canónico), el merge sobrescribirá los campos del JSON sobre el doc real. Para evitarlo: **no ejecutar `npm run seed:cat` a ciegas en producción**; usar solo `npm run seed-places` (que solo escribe `places`/`eventos` mock) o revisar antes con `npm run audit-refs`.
- Si el conflicto es de **referencias huérfanas** (`places`/`eventos` apuntan a slugs que no existen en los catálogos), el seed **no** los corrige: `npm run audit-refs` los listará como `huerfanos` y el backend con `CATALOG_VALIDATION_ENABLED=true` rechazará esas creaciones/ediciones. Corregir el dato manualmente o crear el catálogo faltante antes de re-seedear.

## Notas

- El seed de places/eventos es **idempotente** por slug (no crea duplicados) — al ejecutar varias veces no rompe datos existentes.
- Los JSON canónicos leídos viven en `frontend/src/app/shared/data-access/local/data/categorias.json` y `barrios.json`. Si modificas esos archivos, debes re-ejecutar `npm run seed:cat` para sincronizar Firestore.
- Si el script detecta documentos en `places`/`eventos` con catalog refs inválidos durante `npm run seed-places`, **aborta con error** — debes correr `npm run audit-refs` y corregir primero.
