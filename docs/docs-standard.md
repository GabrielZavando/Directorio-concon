# docs/ Standard — Estructura canónica de documentación (Specboot)

Este documento define el esqueleto estándar de la carpeta `docs/` que todo proyecto
SDD generado por Specboot debe tener, y marca qué archivos son intocables del
framework y cuáles son del proyecto. Amplía `docs/framework-contract.md`, que define
la frontera global intocable/del proyecto.

## 1. Árbol estándar de `docs/`

```
docs/
├── base-standards.md          # INTOCABLE (framework) — principios SDD/TDD/SOLID
├── project/                   # DEL PROYECTO
│   ├── domain.md              # descripción del dominio
│   ├── stack.md               # stack técnico
│   └── client.md              # cliente / audiencia
├── api/                       # DEL PROYECTO
│   └── api-spec.yml           # contratos de API (OpenAPI 3.0)
├── data-model/                # DEL PROYECTO
│   └── data-model.md          # modelo de datos
├── backend-standards.md       # DEL PROYECTO (usa base)
├── frontend-standards.md      # DEL PROYECTO (usa base)
├── ci-standards.md            # DEL PROYECTO
├── deploy-standards.md        # DEL PROYECTO
└── documentation-standards.md# DEL PROYECTO
```

> `base-standards.md` es el único archivo intocable de `docs/`: el framework lo inyecta
> y el proyecto no debe editarlo. El resto es del proyecto y se personaliza por stack.

## 2. Frontera intocable / del proyecto (para `docs/`)

| Intocable (framework, inyectado) | Del proyecto (editado por el dev) |
| --- | --- |
| `docs/base-standards.md` | `docs/backend-standards.md` |
| | `docs/frontend-standards.md` |
| | `docs/ci-standards.md` |
| | `docs/deploy-standards.md` |
| | `docs/documentation-standards.md` |
| | `docs/project/domain.md` |
| | `docs/project/stack.md` |
| | `docs/project/client.md` |
| | `docs/api/api-spec.yml` |
| | `docs/data-model/data-model.md` |

**Regla**: `base-standards.md` es inyectado por el framework (vía `specboot update`) y no
debe ser editado localmente por el dev. Si se necesita cambiar su comportamiento, proponerlo
a través del flujo SDD del propio Specboot (dogfooding), no editarlo a mano. Los demás
archivos son propiedad y responsabilidad del proyecto.

El esquema de `.specboot.json` (incluido el campo `extraStandards` que apunta a `docs/`)
se documenta en [`docs/specboot-json-standard.md`](specboot-json-standard.md).

> **Nota de alcance**: `docs/framework-contract.md`, `docs/versioning-standard.md` y este `docs/docs-standard.md` también son documentos inyectados por el framework (se distribuyen con él y se actualizan vía el flujo SDD del propio Specboot, no por el dev del proyecto). En la frontera de `docs/` se marca `base-standards.md` como intocable porque es la plantilla de principios que el dev no debe alterar; `framework-contract.md`, `versioning-standard.md` y `docs-standard.md` se consideran parte del framework y se tratan como tales.

## 3. Regla de carga dinámica del puente `AGENTS.md`

El `AGENTS.md` raíz (inyectado por el framework) carga **siempre** `docs/base-standards.md`
vía `instructions[]`. Para el resto del contexto de `docs/`, el agente activo lo resuelve
**dinámicamente según la tarea**, no mediante una lista fija de rutas:

- Tarea backend detectada → carga `docs/backend-standards.md` y `docs/data-model/data-model.md`.
- Tarea frontend detectada → carga `docs/frontend-standards.md`.
- Tarea que modifica la API → carga `docs/api/api-spec.yml`.
- Tarea de deploy → carga `docs/deploy-standards.md` (vía skill `deploy`).
- Tarea de docs → carga `docs/documentation-standards.md`.
- El contenido de `docs/project/*` se considera contexto siempre disponible y se lee según haga falta (dominio, stack, cliente).

Esto evita que `AGENTS.md` deba enumerar cada archivo de `docs/` y permite que el estándar
crezca sin tocar el puente.

### 3.1 Carga condicional de `docs/project/*` con fallback a placeholder

`AGENTS.md` documenta la carga condicional de los archivos del proyecto porque
OpenCode's `{file:...}` y `instructions[]` requieren que los archivos existan
(`check-refs.sh` falla si faltan). Por tanto, la carga se expresa como **prosa
documentada en el puente**, no como un include condicional real.

Regla canónica:

- `docs/base-standards.md` siempre se carga vía `opencode.json` `instructions[]`.
- Si `docs/project/domain.md` y `docs/project/stack.md` existen → el agente los
  lee como contexto del proyecto (dominio de negocio y stack técnico).
- Si faltan → el agente aplica el contenido por defecto marcado como
  **"placeholder por proyecto"**: lo que el dev debe sustituir. Los
  placeholders usan comentarios HTML `<!-- … -->` para que el dev los identifique
  y reemplace.

Estos archivos son propiedad del proyecto, por lo que el puente **no los
referencia** vía `{file:...}`. Se resuelven como prosa condicional, no como
includes. El contrato detallado del puente vive en
[`docs/framework-contract.md`](framework-contract.md) → "Puente AGENTS.md ↔
docs/".

## 3.2 Validación del puente AGENTS.md

> **Resultado de TICKET-2.2a.** Esta subsección documenta la validación de
> fluidez del puente frente a estructuras de `docs/` parciales o asimétricas.
> Los escenarios Gherkin completos y su trazabilidad viven en
> `openspec/changes/validate-agents-bridge/` (proposal, scenarios, requirements,
> tasks). La codificación normativa de este comportamiento está en
> `openspec/specs/agents-bridge/spec.md` (requisitos REQ-VAB-1 a REQ-VAB-8).

El puente NO es código ejecutable: es prosa declarada en `AGENTS.md` y
resuelta dinámicamente por el agente según el tag de la tarea. Por tanto, la
"ejecución" de los escenarios es **estática/documental**: se verifica que el
texto del puente declara correctamente el comportamiento esperado y que las
herramientas de integridad (`check-refs.sh`, `specboot.sh --ci`) no rompen.

### 3.2.1 Escenario 1 — Proyecto completo con todos los archivos esperados

```
Given el proyecto tiene docs/base-standards.md
  And el proyecto tiene docs/project/domain.md
  And el proyecto tiene docs/project/stack.md
When un agente usa el puente AGENTS.md
Then el puente carga base-standards.md obligatoriamente
  And carga domain.md y stack.md dinámicamente
  And el flujo SDD continúa sin errores
```

**Resultado (OK):** `AGENTS.md` §1 carga `base-standards.md` siempre; §2.1
mapea el tag a los estándares; §2.2 lee `docs/project/*` si existen.
`check-refs.sh` → 0 errores, `specboot.sh --ci` → 0 errores.

### 3.2.2 Escenario 2 — Proyecto parcial (falta algún archivo del project/)

```
Given el proyecto tiene docs/base-standards.md
  And el proyecto NO tiene docs/project/domain.md
When un agente usa el puente AGENTS.md
Then el puente carga base-standards.md obligatoriamente
  And usa fallback placeholder para domain.md
  And documenta que domain.md está pendiente
```

**Resultado (OK con fallback):** `AGENTS.md` §2.2 declara el fallback a
placeholder por proyecto (`<!-- … -->`). Como `domain.md` no se referencia
vía `{file:...}`, su ausencia no dispara error en `check-refs.sh`. La traza
"domain.md está pendiente" queda visible para el dev. `specboot.sh --ci` → 0
errores (warning informativo, no fatal).

### 3.2.3 Escenario 3 — Proyecto sin subcarpetas de framework

```
Given el proyecto tiene docs/base-standards.md
  And el proyecto tiene docs/ pero sin carpetas project/api/data-model
When un agente usa el puente AGENTS.md
Then el puente carga base-standards.md
  And emite una advertencia sobre estructura incompleta
  And no rompe el flujo SDD
```

**Resultado (OK con advertencia de bootstrap):** `base-standards.md` se sigue
cargando; solo se cargan los estándares del tag activo. La "advertencia" se
materializa porque §4 de este mismo doc lista los archivos que el dev debe
crear: el proyecto está en fase de bootstrap. `check-refs.sh` → 0 errores;
`specboot.sh --ci` → 0 errores (placeholders pendientes reportados como
información).

### 3.2.4 Casos límite (edge cases) documentados

| # | Caso límite | Comportamiento esperado | check-refs.sh | specboot.sh --ci |
| --- | --- | --- | --- | --- |
| A | Tag desconocido / ausente | El agente infiere el tag y pregunta antes de cargar; no carga "por si acaso" | 0 | 0 |
| B | Falta `docs/base-standards.md` | **Rompe intencionalmente**: error de referencia rota → ejecutar `specboot update` | Error | n/a |
| C | Falta `AGENTS.md` | **Rompe intencionalmente**: el proyecto no tiene puente → `specboot update` | n/a | n/a |
| D | Falta `opencode.json` | **Rompe intencionalmente**: no hay instrucciones que cargar → `specboot update` | 0 (no hay refs) | n/a |

Los casos **B/C/D rompen el flujo SDD a propósito**: son señales de que el
proyecto no tiene el framework correctamente inicializado. La acción
correctiva en todos ellos es ejecutar `specboot update`, nunca editar
manualmente los archivos intocables.

### 3.2.5 Matriz de resultados de validación

| # | Escenario | Resultado | check-refs.sh | specboot.sh --ci |
| --- | --- | --- | --- | --- |
| 1 | Proyecto completo | OK | 0 | 0 |
| 2 | Proyecto parcial (falta `domain.md`) | OK con fallback placeholder | 0 | 0 (warning) |
| 3 | `docs/` sin subcarpetas | OK con advertencia de bootstrap | 0 | 0 (placeholders) |
| A | Tag desconocido/ausente | OK, agente pregunta | 0 | 0 |
| B | Falta `base-standards.md` | **Rompe** (deseable) | Error | n/a |
| C | Falta `AGENTS.md` | **Rompe** (deseable) | n/a | n/a |
| D | Falta `opencode.json` | **Rompe** (deseable) | 0 (no refs) | n/a |

> **Conclusión de la Fase 2:** el puente `AGENTS.md ↔ docs/` es fluido y no
> rompe el flujo SDD ante estructuras parciales o asimétricas de `docs/`,
> siempre que los archivos intocables del framework estén presentes. La
> verificación con `check-refs.sh` y `specboot.sh --ci` se mantiene en `0`
> errores para los 3 escenarios del ticket.

## 4. Puesta en marcha de un proyecto nuevo

1. El framework inyecta `docs/base-standards.md` (intocable).
2. El dev crea/completa `docs/project/{domain.md, stack.md, client.md}` con el contexto real.
3. El dev edita `docs/backend-standards.md`, `docs/frontend-standards.md`, `docs/ci-standards.md`,
   `docs/deploy-standards.md` y `docs/documentation-standards.md` según su stack.
4. El dev coloca `docs/api/api-spec.yml` y `docs/data-model/data-model.md`.

## 5. Relación con el contrato del framework

Este estándar concreta, para la carpeta `docs/`, la frontera global intocable/del proyecto
declarada en `docs/framework-contract.md`. Allí se define además la ruta canónica de
artefactos SDD: `openspec/` (sin punto).
