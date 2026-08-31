# Skill: verify

## Description

Executes tests and verifies the active OpenSpec change works. Uses selective context loading via Suggested Path/Test Path metadata from tasks, runs pytest/npm test runners when available, and emits a compact YAML summary. Read-only agent.

## Step 1 — Identificar cambio activo

Listar `openspec/changes/` y tomar el único cambio activo. Si hay varios, pedir al usuario cuál. Si hay 0, error.

## Step 2 — Trazabilidad de artefactos

Validar cadena Requisito ↔ Escenario ↔ Tarea antes de tocar código:

- Cada requisito en `requirements.md` debe tener ≥1 escenario en `scenarios.md`.
- Cada escenario debe tener ≥1 tarea en `tasks.md` que lo cubra.
- Ejecutar `openspec validate {change}` como validación de esquema de carpeta.
- Falla temprano con error claro si la cadena está rota; detener proceso antes de verificar código.

## Step 3 — Contexto selectivo via `Suggested Path`

Leer **solo** los archivos listados en cada tarea bajo los campos `Suggested Path` (implementación) y `Test Path` (tests). Si un `Suggested Path` no existe → marcar tarea como `❌ Archivo no implementado` y pasar a la siguiente.

## Step 4 — Detección de stack (stack-agnóstico)

- Buscar `package.json` → stack Node: `npm test` / `npx vitest` / `npx jest` según scripts definidos.
- Buscar `pyproject.toml` o `requirements.txt` → stack Python: `pytest` con scripts del proyecto.
- Si no hay indicador de stack → advertir "stack no detectado" y proceder a verificación estática ligera solo con `Suggested Path`.

## Step 5 — Verificación ejecutable reforzada

### 5a — Localizar tests del change

- Por convención: `tests/**/*{change-name}*`, `tests/**/*.spec.*`, `tests/**/*.test.*`.
- Por referencia en `Test Path` de las tareas (campo añadido por `plan-change`).
- Si se encuentran → proceder a la 5b. Si no → marcar como `⚠️ Sin evidencia ejecutable` y pasar al fallback estático (Step 5e).

### 5b — Ejecutar test runner

- Detectar automáticamente el runner (`pytest`, `npm test`, `npx vitest`, `npx jest`).
- Ejecutar con banderas de salida corta:
  - `pytest {changed-path} -v --tb=short -q` (Python)
  - `npm test -- --testPathPattern="{changed-path}" --tb=short -q` (Node)
  - `npx vitest run {changed-path} --reporter=dot` (Node)
  - `npx jest --testPathPattern="{changed-path}" --tb=short -q` (Node)
- Parsear resultado: PASS → ✅; FAIL → ❌ con resumen resumido del traceback (no el trace completo).

### 5c — Cobertura de escenarios por tests

- Para cada escenario Gherkin en `scenarios.md`, verificar que al menos un test (por nombre o título) haga referencia o cubra ese escenario.
- Escenario sin test → ⚠️ "sin evidencia ejecutable" en el reporte final, pero **no** marcar como ✅.

### 5d — Smoke check de integración (opcional)

- Si el change declara endpoints nuevos o configuración de API en `docs/api/api-spec.yml`, y el proyecto tiene scripts de e2e/tests de integración (`tests/e2e`, `*.e2e-spec.*`), ejecutarlos.
- **Condición**: el change debe declarar explícitamente el endpoint objetivo y el proyecto debe tener un script de arranque (`npm run start:dev`, `uvicorn ...`, etc.) y un script de test de smoke en `package.json`.
- Si la infraestructura no existe (no hay scripts e2e, no hay proyecto levantable), **omitir** y no reportar error. Esto es opt-in por declaración.

### 5e — Fallback estático (cuando NO hay tests)

- Verificar cada tarea leyendo solo `Suggested Path`:
  - Archivo existe ✅
  - Archivo contiene referencias a entidades/endpoints mencionados en los escenarios ✅
  - Si falta archivo → ❌; si archivo vacío/sin referencias → ⚠️.
- Marcar explícitamente en el reporte: `status: PARTIAL` + nota "verificado solo estáticamente, evidencia débil".
- **Nunca** marcar como ✅ en este camino.

## Step 6 — Delta incremental

- `git diff --name-only $(git merge-base HEAD main)...HEAD` (fallback: `git status --porcelain`).
- Tareas cuyos archivos no aparecen en el diff y ya fueron verificadas en ejecuciones previas → "✅ sin cambios".
- Demás tareas → verificar completa (Step 5).
- **Nota**: esta mejora usa git y no requiere estado persistido, como acordado en la decisión 2.

## Step 7 — Informe en pantalla estructurado

Imprimir un bloque YAML compacto (solo pantalla, no persistido):

```yaml
change: {name}
status: PASS|PARTIAL|FAIL
summary:
  total_tasks: N
  completed: N
  failed: N
  untested: N
details:
  - task: "2.1 Create PasswordResetRepository"
    status: PASS
    file: src/infrastructure/repositories/password_reset_repository.py
    evidence: "Class implements IRepository interface"
  - task: "3.3 Handle invalid email"
    status: FAIL
    file: src/application/handlers/reset_handler.py
    error: "Missing try-except block for UserNotFound"
```

Encima del bloque YAML: 3 líneas de resumen plano:

- `status: PASS` | `failed: 2` | `untested: 1`
- Lista plana de FAILs: `- ❌ Task 3.3 — src/.../reset_handler.py: Missing try-except`

Nada de narrativa larga, párrafos explicativos o metadata de debugging.

## Stack Notes

- Sin asumir `pytest` ni `jest` a priori.
- El stack se detecta por archivos de configuración reales en el repositorio.
- Si el proyecto tiene scripts de test personalizados, `plan-change` puede añadir `Test Path` personalizado; verify debe usarlos.