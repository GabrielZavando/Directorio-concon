# Versioning Standard — SemVer y matriz de ruptura (Specboot)

Este documento es el **estándar canónico de versionado** del framework
`@gabrielzavando/specboot`. Es un documento del framework (intocable para el dev del
proyecto), distribuido con el paquete npm. Amplía `docs/framework-contract.md` (que
declara la opción A de actualización y que `.specboot.json` lleva `frameworkVersion`) y
`docs/specboot-json-standard.md` (que define el campo `frameworkVersion` en formato SemVer).

## 1. Propósito

Specboot inyecta archivos en el proyecto y `specboot update` los reemplaza **sin piedad**
(opción A del contrato). El dev no toca esos archivos, así que el número de versión del
framework debe comunicar inequívocamente cuándo una actualización es transparente
(`patch`/`minor`) y cuándo el proyecto debe revisar su configuración o contexto (`major`).
Este estándar fija esa semántica y la matriz que la determina. Es la fuente de verdad que
Fase 4 (`specboot update`) y Fase 7 (release) implementan.

## 2. Reglas SemVer

- Formato: `MAJOR.MINOR.PATCH` (ej. `0.1.1`).
- El número vive en `package.json` del framework y se refleja en `frameworkVersion` del
  `.specboot.json` de cada proyecto consumidor.
- **Durante `0.x`**: se trata como "API no estable". Un cambio `minor` *puede* romper, pero
  se registra igual según la matriz de la sección 3. Al llegar a `1.0.0`, aplica SemVer
  estricto (todo `major` es ruptura garantizada; `minor`/`patch` nunca rompen).
- Comparación: `validate-specboot.sh` (TICKET-0.3) ya compara `frameworkVersion` del
  proyecto contra la versión instalada. El significado de esa comparación es lo que define
  este documento.

## 3. Matriz de ruptura (canónica)

Cada tipo de cambio del framework se clasifica en un nivel. El nivel determina si el
proyecto consumidor debe actuar tras `specboot update`.

| Tipo de cambio en el framework | Nivel | ¿El proyecto debe actuar? |
| --- | --- | --- |
| Fix de bug en script/tool sin cambio de interfaz | patch | No |
| Corrección de typo/placeholder en `base-standards.md` (intocable) | patch | No |
| Corrección de ruta `.openspec/`→`openspec/` en skills | patch | No |
| Nuevo agente/skill/comando **opcional** | minor | No (puede ignorarlo) |
| Nuevo campo **opcional** en `.specboot.json` | minor | No |
| Mejora de un estándar en `base-standards.md` sin cambiar estructura | minor | No (revisar si aplica) |
| Cambio de esquema **obligatorio** en `.specboot.json` | major | Sí: migrar `.specboot.json` |
| Reestructuración del árbol `docs/` | major | Sí: re-mapear `docs/` |
| Renombre/eliminación de un comando o agente | major | Sí: ajustar flujo |
| Cambio en cómo el `AGENTS.md` puente carga contexto | major | Sí: revisar `docs/` |
| Cambio de comportamiento de `specboot update` (pisa algo del proyecto) | major | Sí: revisar |

### 3.1 Clasificación de los tickets 0.1–0.3 (ejemplos de referencia)

- Corrección de rutas `.openspec/`→`openspec/` en skills y en el contrato → **patch**.
- Corrección de placeholder en `base-standards.md` → **patch**.
- Nuevo campo opcional `layers` en `.specboot.json` (TICKET-0.3) → **minor** (no rompe la
  validación; es opt-in del proyecto).
- Reestructuración del árbol `docs/` (TICKET-0.2, migración a ruta canónica `openspec/`) →
  **major** (el proyecto debe re-mapear sus referencias).

## 4. Significado de cada nivel para el consumidor

- **patch** — Cambios internos del framework que no alteran la interfaz ni los archivos
  inyectados (ej. fix de un warning en `base-standards.md`, corrección de rutas
  `.openspec/`→`openspec/`). El proyecto actualiza con `specboot update` **sin acción**.
- **minor** — Se añade funcionalidad del framework sin romper lo existente (ej. nuevo agente,
  nuevo skill, nuevo comando, nuevo campo opcional en `.specboot.json`). El proyecto
  actualiza; sus archivos existentes no se rompen, pero puede aprovechar lo nuevo.
- **major** — Cambio que altera la interfaz del framework o los archivos inyectados de forma
  que el proyecto debe revisar config/contexto (ej. cambio de esquema obligatorio en
  `.specboot.json`, reestructuración del árbol `docs/`, cambio de nombre de un comando,
  cambio de la carga del `AGENTS.md` puente). El proyecto debe leer las release notes y
  posiblemente migrar `.specboot.json` / `docs/`.

## 5. Comportamiento de `specboot update` ante versiones (definición para Fase 4)

`specboot update` reemplaza los archivos inyectados según la opción A del contrato. Su
comportamiento ante el salto de versión se define aquí:

- Si `update` detecta un salto **major** (el `frameworkVersion` de `.specboot.json` del
  proyecto es menor que la versión instalada del paquete): imprime la advertencia
  `⚠️ Breaking change. Lee CHANGELOG/release notes de vX.Y.Z` y procede a reemplazar los
  archivos (opción A), pero avisa antes.
- Si el salto es **minor** o **patch**: reemplazo **silencioso**, sin advertencia de ruptura.
- En ningún caso `specboot update` toca `docs/` del desarrollador ni el código del proyecto.

## 6. Formato de CHANGELOG / Release notes

- El `CHANGELOG.md` del repo Specboot sigue [Keep a Changelog](https://keepachangelog.com/)
  y [Semantic Versioning](https://semver.org/).
- Cada entrada de versión usa `## [MAJOR.MINOR.PATCH] - YYYY-MM-DD`.
- Cada release **major** debe incluir una sección `### Breaking changes` listando los
  cambios que rompen, y (si aplica) una sección de **migración** indicando qué revisar en
  `.specboot.json` / `docs/` / variables de entorno.
- La entrada `0.1.1` de este repo sirve de ejemplo del formato, con su subsección
  `### Breaking changes: None` como plantilla reutilizable para versiones sin ruptura.

### 6.1 Cómo se declara la ruptura en el momento del release

1. En el `CHANGELOG.md`, bajo la entrada de la versión, añadir `### Breaking changes` con la
   lista concreta de cambios clasificados como `major` en la sección 3.
2. Si la migración lo requiere, añadir `### Migration` describiendo los pasos (ej. nuevo campo
   obligatorio en `.specboot.json`, re-mapeo de `docs/`).
3. El release (Fase 7) debe hacer coincidir `package.json` con esa entrada y el dogfooding
   debe pasar por el flujo SDD antes de publicar.

## Release automático

El workflow `release.yml` publica `@gabrielzavando/specboot` a **GitHub Packages** al mergear
a `main` (o al crear/editar un Release en GitHub). Antes de publicar, valida el framework
completo:

1. `bash check-refs.sh` — integridad referencial de `{file:...}`.
2. `bash specboot.sh --ci` — framework self-check (estructura, schemas, integridad).
3. `make ci` — CI gate del proyecto (`refs` + `solid-lint` + `lint` + `test` + `audit`).
4. `tests/*-test.sh` — self-tests internos del framework (gated por `hashFiles` a nivel de
   step, consumer-safe).

Si alguna validación falla, **no se publica** (el job `publish` depende de `validate`
vía `needs: validate`).

**Triggers del workflow:**

```yaml
on:
  push:
    branches: [main]
  release:
    types: [published]
```

**Publicación:** `npm publish` a `https://npm.pkg.github.com` usando
`NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` con `permissions: packages: write`. Se ejecuta
`npm pack --dry-run` antes de publicar.

**Versionado:** el mantenedor incrementa `version` en `package.json` (SemVer, ver matriz de
ruptura en §3) antes del merge. El release workflow **NO** hace bump automático; el
`update.sh --bump` del mantenedor es sólo una conveniencia local y no es invocado por el
workflow.

## 7. Relación con el contrato del framework

Este estándar concreta, para el versionado, la frontera global intocable/del proyecto
declarada en `docs/framework-contract.md`: `versioning-standard.md` es **intocable** (lo
inyecta/actualiza el framework vía `specboot update`); el `.specboot.json` del proyecto
(que lleva `frameworkVersion`) es **del proyecto** y lo edita el dev. El formato de
`frameworkVersion` se valida según `docs/specboot-json-standard.md` (TICKET-0.3).

Véase también: [Contrato del Framework Specboot](framework-contract.md).
