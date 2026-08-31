# Contrato del Framework Specboot

## Resumen ejecutivo

Specboot es un framework de desarrollo SDD (Spec-Driven Development) que enjaula un flujo obligatorio de especificación-antes-código, estándares fijos de agentes/skills y una frontera estricta entre lo que el framework inyecta (intocable) y lo que el proyecto personaliza.

## Principios rectores

1. **Specboot es un framework / entorno de desarrollo** que provee herramientas (agentes, subagentes, skills, conexiones MCP, contexto) para desarrollar cualquier software siguiendo SDD, obligando a respetar el flujo. El contexto vive en `docs/` y cambia por proyecto; las herramientas y buenas prácticas (TDD, SOLID, pruebas) las determina el framework y mejoran por versión.
2. **El dev activa el flujo explícitamente**: ejecuta los comandos y alimenta el proyecto con archivos de contexto e MCP.
3. **La estructura del proyecto la define el dev** según su stack; Specboot no impone carpetas.
4. **Hay un estándar de versionado** (definido en [`docs/versioning-standard.md`](versioning-standard.md)); el propio desarrollo de Specboot sigue su ciclo SDD (dogfooding).
5. **`AGENTS.md` vive en la raíz de cada proyecto** pero lo provee/inyecta el framework como puente. Specboot es una dependencia de desarrollo.
6. **Agentes y skills son fijos y definidos por el framework (prefabricados)**, aportan estándares (calidad, TDD, SOLID), no código.
7. **Las MCP son del proyecto**; el framework solo declara dónde se conectan. Queda abierto un MCP transversal futuro definido por el framework.
8. **Actualización opción A**: `specboot update` reemplaza los archivos del framework sin piedad; el dev no los toca (como `node_modules`); `docs/` es la única superficie de personalización.
9. **Makefile y workflows los provee el framework (intocables)**; el proyecto los adapta vía `.specboot.json` + variables de entorno sin editarlos; los agentes los invocan según la tarea.
10. **El paquete npm `@gabrielzavando/specboot` es la única forma de distribuir**; publicación automática por release (rama por cambio → merge a main → release cuando la versión esté lista); versionado SemVer.

## Arquitectura de distribución

Specboot se distribuye como un único paquete npm: `@gabrielzavando/specboot`. Esa es la **única** forma de distribución.

- El proyecto lo instala como **dependencia de desarrollo** (`devDependency`), no como runtime.
- El paquete inyecta en el proyecto los archivos intocables (ver sección *Frontera intocable / del proyecto*): `AGENTS.md` (puente), comandos y agentes de OpenCode, skills, scripts de validación, `Makefile`, plantillas de CI y workflows.
- El proyecto no forkea ni copia el framework fuera del mecanismo de instalación/actualización; cualquier desviación es un bug, no un feature.
- La publicación es automática por release: rama por cambio → merge a main → release cuando la versión (SemVer) esté lista.

### Distribución vía npm

El paquete `@gabrielzavando/specboot` publica **únicamente** los activos intocables del
framework. La allowlist `files` de `package.json` es la fuente de verdad de lo que viaja
en el tarball; cualquier archivo no listado queda fuera.

- **Se publican**: comandos (`.opencode/commands/`), agentes (`.opencode/agents/`),
  `ai-specs/`, scripts de validación (`check-refs.sh`, `specboot.sh`,
  `validate-specboot.sh`), `templates/ci/`, los **5 documentos estándar**
  (`docs/base-standards.md`, `docs/framework-contract.md`, `docs/docs-standard.md`,
  `docs/specboot-json-standard.md`, `docs/versioning-standard.md`), `opencode.json`,
  `AGENTS.md`, `Makefile`, `.github/workflows/`, `LICENSE` y `README.md`.
- **NO** se publica `docs/` del proyecto (salvo los 5 estándares): al filtrarse por
  `files`, el repositorio de desarrollo de Specboot conserva sus propios `docs/`
  (backend/frontend/documentation/deploy standards, `api/`, `data-model/`,
  `ci-standards.md`, `project/`) sin que estos lleguen a los consumidores. Esto evita
  confusión durante el dogfooding: lo que ves en el repo no es lo que instala
  `npm install`.
- Tampoco se publican: código de aplicación, `.specboot.json`, servidores MCP ni
  variables de entorno del proyecto.

### Rutas canónicas de artefactos SDD

Los artefactos del ciclo SDD (changes, specs y tickets enriquecidos) viven en la ruta canónica **`openspec/`** (sin punto), coherente con el CLI `openspec` 1.3.1. Concretamente:

- `openspec/changes/<change-name>/` — propuesta, scenarios, requirements, tasks y `specs/<capability>/spec.md` del cambio activo.
- `openspec/tickets/<TICKET-ID>-enriched.md` — artefacto enriquecido que `/plan-change` usa como fuente primaria.
- `openspec/specs/` — especificaciones consolidadas tras `/archive`.

Cualquier documentación o skill que referenciara `.openspec/` (con punto) estaba desactualizada; esa migración se realizó en TICKET-0.2, pasando todo a la ruta canónica `openspec/`. El estándar concreto de la carpeta `docs/` (árbol y frontera intocable/del proyecto por archivo) se documenta en `docs/docs-standard.md`.

## Frontera intocable / del proyecto

La siguiente tabla es la regla de verdad sobre qué puede y qué no puede editar un desarrollador en su proyecto. No es negociable ni ambigua.

| Intocable (del framework, inyectado, no editado por el dev) | Del proyecto (editado por el dev) |
| --- | --- |
| `AGENTS.md` (puente) | `docs/` (salvo `base-standards.md`) |
| `.opencode/commands/*` | `.specboot.json` |
| `.opencode/agents/*` | código del proyecto (`backend/`, `frontend/`) |
| `ai-specs/*` | variables de entorno / GitHub vars |
| `check-refs.sh` | MCP del proyecto |
| `specboot.sh` | |
| `Makefile` (genérico) | |
| `templates/ci/*` | |
| `.github/workflows/*` (del framework) | |
| `docs/base-standards.md` | |
| `docs/versioning-standard.md` | |

Regla: los archivos de la columna **Intocable** son inyectados y actualizados por el framework (vía `specboot update`). Si un desarrollador necesita cambiar su comportamiento, debe proponer el cambio a través del flujo SDD del propio Specboot (dogfooding), no editarlos localmente. Los archivos de la columna **Del proyecto** son responsabilidad y propiedad del desarrollador.

El esquema y la validación de `.specboot.json` (columna Del proyecto) se definen en [`docs/specboot-json-standard.md`](specboot-json-standard.md).

### Puente AGENTS.md ↔ docs/

`AGENTS.md` (raíz del proyecto) es un archivo **intocable del framework** que
funciona como **puente dinámico** entre el agente y el proyecto. Su contrato
es el siguiente:

- **Inyección y reemplazo**: el framework lo inyecta en cada proyecto y lo
  reemplaza íntegramente vía `specboot update`. El dev no lo edita
  localmente. Es intocable, igual que `docs/base-standards.md` y el resto de
  la columna izquierda de la tabla de frontera.
- **Lo que carga siempre**: `docs/base-standards.md` vía `opencode.json`
  `instructions[]`. Es la carga base del puente.
- **Lo que carga dinámicamente**: el resto del contexto de `docs/`, resuelto
  por el agente activo según la tarea (tag `[backend]`, `[frontend]`,
  `[api]`, `[docs]`, `[deploy]`, etc.). El puente nunca hardcodea el
  dominio, el stack ni el cliente del proyecto.
- **Carga condicional de `docs/project/*`**: el puente documenta en prosa que
  el agente debe leer `docs/project/domain.md` y `docs/project/stack.md` si
  existen; si faltan, aplica el contenido por defecto marcado como
  "placeholder por proyecto". OpenCode's `{file:...}` no se usa para
  `docs/project/*` porque son archivos del proyecto y pueden no existir
  (`check-refs.sh` fallaría). El detalle canónico de esta regla vive en
  [`docs/docs-standard.md`](docs-standard.md) §3.1.
- **No duplica contenido**: el puente no contiene el dominio ni el stack del
  proyecto. Si el dev siente la tentación de pegar una descripción de
  dominio o un listado de stack en `AGENTS.md`, ese contenido pertenece a
  `docs/project/{domain,stack,client}.md` (o al `docs/*.md` correspondiente).
- **Estructura estable**: las cuatro secciones del puente son
  **Carga base**, **Carga dinámica**, **Herramientas** y
  **Nota de puente**. Añadir o renombrar secciones es un cambio al
  framework y debe pasar por el flujo SDD del propio Specboot.
- **Actualización sin pérdida de contexto**: tras un `specboot update`, el
  `AGENTS.md` se reemplaza íntegramente, pero el contexto del proyecto se
  preserva porque vive en `docs/`, no en el puente.

Este contrato se materializa en `AGENTS.md` y se complementa con la regla
de carga de `docs/` detallada en [`docs/docs-standard.md`](docs-standard.md)
§3.

## Flujo SDD obligatorio

El ciclo es obligatorio y se ejecuta en este orden:

1. `/plan-change` — genera propuestas OpenSpec validadas y enriquecidas a partir del ticket (usa el artefacto enriquecido si existe).
2. `/apply` — implementa las tareas de los artefactos OpenSpec respetando TDD y los estándares.
3. `/verify` — ejecuta las pruebas y verifica que el cambio activo funciona (trazabilidad, delta incremental).
4. `/archive` — cierra el ciclo SDD: pre-checks, `openspec archive`, manifest y staging para commit.
5. `/commit` — crea commits convencionales y el pull request.

El flujo se alimenta de contexto: `docs/` del proyecto + servidores MCP disponibles. Esta sección es autocontenida: no requiere leer `AGENTS.md` para entender el flujo.

## Modelo de actualización

Specboot sigue la **opción A**: `specboot update` reemplaza los archivos del framework **sin piedad**.

- Los archivos intocables (columna izquierda de la tabla anterior) se sobrescriben íntegramente con la versión del paquete.
- `specboot update` **nunca** toca `docs/` del desarrollador ni el código del proyecto.
- Si un desarrollador editó manualmente un archivo intocable, la edición se pierde al actualizar; el contrato del framework gana. Esta es una decisión de diseño deliberada, no un accidente.

## Inicialización con `specboot init`

`specboot init` (TICKET-3.1) es el comando que **crea un proyecto nuevo desde cero** inyectando los archivos intocables del framework. Es distinto de:

- `specboot.sh --init` (con guiones): sólo *verifica* que un proyecto ya inicializado tiene la estructura correcta (no crea nada).
- `specboot update` (TICKET-3.2): *sincroniza* los archivos intocables de un proyecto ya existente sin tocar `docs/` ni el código del proyecto.

### Comportamiento

1. **Guard**: si ya existe `.specboot.json` en el directorio actual, `specboot init` avisa (`⚠ Ya existe .specboot.json. Usa 'specboot update' para actualizar.`) y sale 0 sin sobrescribir nada.
2. **Resolución del origen**: el comando resuelve la ubicación de los archivos del framework en este orden:
   - `--template <dir>` (si se pasa).
   - El directorio del propio `specboot.sh` (el paquete instalado en `node_modules/@gabrielzavando/specboot`, o el repo del framework en dogfooding).
3. **Copia de archivos intocables**: copia los archivos del allowlist `files` de `package.json` (`.opencode/`, `ai-specs/`, `check-refs.sh`, `specboot.sh`, `validate-specboot.sh`, `templates/ci/`, los 5 documentos estándar, `opencode.json`, `AGENTS.md`, `Makefile`, `.github/`, `LICENSE`, `README.md`) al directorio actual. Los archivos que ya existen en el proyecto **no se sobrescriben** (se omiten con advertencia).
4. **Creación de `.specboot.json`**: genera `.specboot.json` con `frameworkVersion` (la versión del framework), `services: ["."]` y `stack: "framework"` por defecto; si se pasa `--interactive`, solicita nombre, stack y services al usuario.
5. **Esqueleto de `docs/`**: crea las plantillas del proyecto (propiedad del dev) que no existan — `backend-standards.md`, `frontend-standards.md`, `ci-standards.md`, `deploy-standards.md`, `documentation-standards.md`, `project/{domain,stack,client}.md`, `api/api-spec.yml`, `data-model/data-model.md` — sin sobrescribir las existentes. Los 5 documentos intocables ya fueron copiados en el paso 3.

### Uso

```bash
# Desde un proyecto vacío (o con código propio, sin .specboot.json):
bash node_modules/@gabrielzavando/specboot/specboot.sh init

# Con valores interactivos:
bash node_modules/@gabrielzavando/specboot/specboot.sh init --interactive

# Desde un origen explícito (p.ej. el repo del framework en desarrollo):
bash specboot.sh init --template /ruta/a/specboot
```

Después de `init`, el proyecto ya tiene el puente `AGENTS.md`, los agentes/skills de OpenCode y los scripts de validación. El dev completa entonces los archivos de `docs/project/*` y `docs/*-standards.md` con el contexto real, y corre `specboot.sh --init` para verificar la estructura.

## Actualización con `specboot update`

`specboot update` (TICKET-3.2) es el comando que **sincroniza un proyecto ya inicializado** con una versión nueva del framework, reemplazando los archivos intocables según el modelo opción A. Es distinto de `specboot init` (crea desde cero) y de `specboot.sh --init` (sólo verifica). El script `update.sh` heredado mantiene únicamente su modo `--bump` para releases de maintainers; su modo de sincronización está deprecado a favor de `specboot update`.

### Comportamiento

1. **Guard**: si no existe `.specboot.json` en el directorio actual, `specboot update` imprime `❌ No existe .specboot.json. Usa 'specboot init' para crearlo.` y sale 1 sin modificar nada.
2. **Resolución del origen**: prefiere `--template <dir>` y cae por defecto al directorio del propio `specboot.sh` (el paquete instalado o el repo del framework en dogfooding). Si el origen resuelto es igual al directorio destino (dogfooding sobre sí mismo), avisa y no sincroniza.
3. **Comparación de versiones**: lee `frameworkVersion` de `.specboot.json` y lo compara con la versión instalada del framework. Si la instalada es **menor**, rechaza con exit 1 (no se permite retroceder).
4. **Salto major**: imprime `⚠️ Breaking change. Lee CHANGELOG/release notes de vX.Y.Z` y pide confirmación (o procede con `--yes`). En **minor/patch** el reemplazo es **silencioso**, sin advertencia.
5. **Backup**: antes de reemplazar, copia los archivos actuales a `.specboot-backup-<timestamp>/` (salvo `--no-backup`) y añade el patrón `.specboot-backup-*` a `.gitignore` si existe.
6. **Reemplazo sin piedad (opción A)** de `UPDATE_ITEMS[]`: `.opencode/commands`, `.opencode/agents`, `ai-specs`, `check-refs.sh`, `specboot.sh`, `validate-specboot.sh`, `templates/ci`, los 5 documentos estándar, `opencode.json`, `AGENTS.md`, `Makefile`, y los `.github/workflows/*` del framework (archivo por archivo). **Exclusiones deliberadas**: `README.md` y `LICENSE` del proyecto nunca se tocan; `.github/` se trata archivo por archivo para no borrar workflows del proyecto.
7. **Nunca toca `docs/` del proyecto** (salvo los 5 estándares) ni el código (`backend/`, `frontend/`…).
8. **Reescritura de `.specboot.json`**: si la versión cambió, actualiza `frameworkVersion` preservando el resto de campos; si es igual, el archivo queda intacto (modo reparación de intocables editados a mano).
9. **Post-validación**: corre `check-refs.sh` (estricto: exit 1 si hay referencia rota) y `specboot.sh --ci` (sólo avisa: la completitud del proyecto consumidor no bloquea).

### Uso

```bash
# Desde un proyecto ya inicializado:
bash node_modules/@gabrielzavando/specboot/specboot.sh update

# Aceptar un salto major sin preguntar (CI / no-TTY):
bash node_modules/@gabrielzavando/specboot/specboot.sh update --yes

# Previsualizar sin cambiar nada:
bash node_modules/@gabrielzavando/specboot/specboot.sh update --dry-run

# Desde un origen explícito (p.ej. el repo del framework en desarrollo):
bash specboot.sh update --template /ruta/a/specboot

# Sin backup:
bash node_modules/@gabrielzavando/specboot/specboot.sh update --no-backup
```

## Makefile del framework

El `Makefile` del framework es **intocable**: el proyecto no lo edita. Se parametriza
vía `.specboot.json` leyendo `services` (rutas relativas a carpetas con código) y
`stack` (`node`, `python`, `framework`, combinaciones en array, o `"auto"` para
autodetección por presencia de manifiestos). La lectura usa `node -e` (convención del
framework), nunca `jq`.

**Targets (gate del proyecto):**

| Target | Qué hace |
|--------|----------|
| `install` | Instala dependencias por servicio (npm/pip) según `stack` |
| `lint` | Linting **propio del proyecto** por servicio (`npm run lint` / `ruff`) |
| `test` | Tests por servicio (`npm test` / `pytest`) |
| `build` | Compilación por servicio (`npm run build` / `python -m build`) |
| `audit` | Auditoría de dependencias (`npm audit` / `pip-audit`) |
| `solid-lint` | SOLID/DIP del framework por servicio (eslint@8 + dependency-cruiser + ruff + import-linter) |
| `commitlint` | Valida mensajes de commit |
| `refs` | Ejecuta `check-refs.sh` del proyecto |
| `validate-specboot` | Valida `.specboot.json` (si `validate-specboot.sh` existe) |
| `ci` | **CI gate del proyecto**: `refs` + `solid-lint` + `lint` + `test` + `audit` |
| `help` | Muestra targets y los `services`/`stack` detectados |

**Comportamiento:**

- Por cada servicio en `services`, el Makefile aplica lint/test/build/audit/install
  según el `stack` declarado; si un servicio no tiene el stack activo, no se linta
  (solo advertencia).
- Si un servicio no existe en disco o no tiene el script/manifest requerido, se salta
  con advertencia y **no se genera error** (exit 0).
- `stack: "framework"` (caso del propio repo de Specboot) hace que los targets de
  app se salten limpio: `make ci` queda en verde.

**`ci` (gate del proyecto) vs `specboot.sh --ci` (framework self-check):**

- `make ci` es el **CI gate del proyecto consumidor**: `refs` + `solid-lint` + `lint` +
  `test` + `audit`.
- `bash specboot.sh --ci` es la validación del **propio framework** (dogfooding) y se
  ejecuta por el desarrollador del framework, **no** como target del Makefile del
  proyecto. En la documentación se nombra como "framework self-check", no como "ci del
  proyecto".

**Customización del proyecto:** el proyecto declara `services` y `stack` en
`.specboot.json`. No edita el Makefile. Para infraestructura específica (VPS, Docker,
etc.) usa variables de entorno de GitHub + configuración propia del proyecto.

**Relación con `specboot update` / `update.sh`:** `specboot update` reemplaza el
`Makefile` del framework como archivo intocable (opción A); `update.sh` mantiene solo
el modo `--bump` y su modo de sincronización está deprecado. Ninguno de los dos debe
ser editado a mano por el proyecto.

## Workflows del framework

Los workflows de GitHub Actions (`ci.yml`, `deploy.yml`, `release.yml`) son
**intocables**: el proyecto no los edita. Se parametrizan vía variables de entorno
de GitHub (repo `vars` + `secrets`).

- **`ci.yml`**: corre `make ci` (CI gate del proyecto). En el repo del framework
  también corre `specboot.sh --ci` como dogfooding (job `validate`), y además
  ejecuta todos los self-tests internos del framework (`tests/*-test.sh`) como un
  step condicional (gated por `hashFiles('tests/*-test.sh')` a nivel de step), en
  loop idéntico al de `release.yml`. En un proyecto consumidor ese job es
  inofensivo y los self-tests se saltan limpiamente porque `tests/` no se publica
  en el paquete npm.
- **`deploy.yml`**: gated por `if: vars.DEPLOY_ENABLED == 'true'`. Lee
  `vars.DOCKER_REPO`, `vars.DEPLOY_HOST`, `vars.DEPLOY_USER` y
  `secrets.DEPLOY_SSH_KEY`. El proyecto declara su infraestructura en GitHub, no
  editando el YAML. Los steps de build/SSH se condicionan además a la presencia de
  un `Dockerfile` vía `hashFiles('Dockerfile')` en step-level `if` (nunca en job-level
  `if`, que es inválido).
- **`release.yml`**: publica el paquete npm del framework a GitHub Packages.
  Dispara en `push: branches: [main]` y en `release: types: [published]`. Tiene
  dos jobs: `validate` (self-check completo: `check-refs.sh` + `specboot.sh --ci` +
  `make ci` + `tests/*-test.sh`) y `publish` (`npm pack --dry-run` + `npm publish`,
  con `needs: validate`, `permissions: packages: write` y
  `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`). Si `validate` falla, no se
  publica. `release.yml` **no invoca** `update.sh --bump`: el bump de versión es
  responsabilidad del maintainer antes del merge (herramienta local, no publicada
  en el paquete).

**Customización:** el proyecto usa variables de entorno (GitHub vars/secrets) para
adaptar el despliegue. Para infraestructura específica (VPS, Docker, repo distinto),
se setea en GitHub, no en el archivo.

**Relación con `update.sh`:** `update.sh` no toca workflows. `specboot update`
reemplaza los workflows del framework como archivos intocables (archivo por archivo,
nunca borra un workflow del proyecto). Ninguno de los dos debe ser editado a mano por
el proyecto.

## Dogfooding

Specboot se desarrolla con su **propio flujo SDD**. El framework no se codifica a mano fuera del ciclo: sus propias features (comandos, skills, frontera, reglas de versión) pasan por `/plan-change → /apply → /verify → /archive → /commit` exactamente como lo haría un proyecto hijo. Cualquier ampliación de la lista de archivos intocables o de los principios rectores debe modificar primero este contrato y luego implementarse, nunca al revés.
