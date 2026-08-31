# Skill: archive

## Description

Closes the SDD cycle by archiving a completed OpenSpec change, updating the main specifications, and preparing the commit for `/commit`. This skill is token-light: it never reads `scenarios.md`, `requirements.md` or `tasks.md` in full, only parsing checkboxes and listing filenames.

## Step 1 — Identificar el change activo

Listar `openspec/changes/` y tomar el único cambio presente. Si hay varios, listar sus nombres y pedir al usuario que indique cuál archivar. Si hay 0, abortar con mensaje *"No hay cambios activos para archivar"*.

## Step 2 — Pre-checks ligeros (sin leer contenido completo)

- Ejecutar `git status --porcelain openspec/` y registrar si hay archivos modificados o untracked distintos de `openspec/changes/` y `openspec/state/`. Si los hay, imprimir *"⚠️ Hay cambios sin commitear en openspec/: [lista]"* (advertir, no abortar).
- Parsear `tasks.md` en busca de checkboxes abiertos (`- [ ]`). **Sólo** contar líneas con `- [ ]` (no escanee el archivo completo). Si quedan pendientes → abortar con *"❌ El cambio tiene tareas pendientes en tasks.md. Complete `/apply` o ejecute los pending tasks antes de archivar."*.
- Detectar el `TICKET-ID` leyendo el header `Ticket ID:` de `proposal.md`. Si no existe, intentar leerlo de `openspec/tickets/{derived-name}-enriched.md` (solo el nombre de archivo, no su contenido).

## Step 3 — Preview (solo nombres, sin contenido)

- Listar los archivos en `openspec/changes/{name}/specs/` con `ls` — solo nombres, no abrirlos.
- Ejecutar `git diff --stat main...HEAD -- openspec/specs/` para mostrar qué specs principales se verán fusionadas.
- **Resumen para el usuario**:
  ```
  Specs que se actualizarán: [auth-spec.md, user-spec.md]
  Tareas pendientes: 0
  Cambios sin commitear en openspec/: [lista vacía o nombres]
  ```
- Preguntar al usuario: *"¿Confirmas archivar este cambio y actualizar los specs principales?"*. Si el usuario no confirma → abortar limpiamente.

## Step 4 — Ejecutar `openspec archive`

- Ejecutar: `openspec archive {name} --yes` (usa el flag --yes para evitar prompts de confirmación, ya decidimos en Step 3).
- Si la CLI devuelve error → abortar y mostrar el error tal cual.
- Si `--skip-specs` es necesario (change tooling/docs), el skill debe detectarlo leyendo el header `Change type:` de `proposal.md` y omitir la fusión de specs si corresponde.

## Step 5 — Generar manifiesto JSON

- Crear/actualizar `openspec/state/manifest.json`.
- Si el archivo no existe, inicializarlo como `{"changes": []}`.
- Añadir una entrada al array `changes`:
  ```json
  {
    "change_name": "{derived-name}",
    "ticket_id": "{TICKET-ID from proposal.md}",
    "archived_at": "{ISO-8601 timestamp}",
    "specs_applied": ["lista de specs fusionadas"]
  }
  ```
- `archived_at` usar formato ISO-8601 (ej. `2026-08-25T14:30:00Z`). Si falla la escritura → advertir pero no abortar (el archive ya se completó).

## Step 6 — Preparar commit (no ejecutar)

- Ejecutar `git add openspec/` para stagear:
  - Los archivos nuevos/archivados en `openspec/archive/`.
  - El `manifest.json` actualizado.
  - Cualquier otro archivo de spec modificado por `openspec archive`.
- **No** ejecutar `git commit`. El commit se deja staged para que `/commit` lo ejecute en el siguiente paso del ciclo.

- Imprimir bloque con mensaje sugerido:
  ```
  chore(specs): archive change PROJ-123 (auth-reset)

  - Specs updated: auth-spec.md, user-spec.md
  - Archived to: openspec/archive/2026-08-25-auth-reset/
  ```
- **Nota**: `/commit` será quien ejecute `git commit -m "..."` en el siguiente paso.

## Step 7 — Limpieza

- Eliminar `openspec/tickets/{TICKET-ID}-enriched.md` si existe (el ciclo del ticket enriquecido terminó).
- **No** tocar archivos dentro de `openspec/archive/` (son histórico).
- Reporte final en YAML compacto (solo pantalla, no persistido):
  ```yaml
  change: auth-reset
  ticket_id: PROJ-123
  status: staged (commit pending)
  specs_applied:
    - auth-spec.md
    - user-spec.md
  ```