# CI Standards — Mechanical SOLID/POO Enforcement

> Panóramico del Ticket 4. Define qué herramientas de análisis estático
> implementan mecánicamente (sin intervención del LLM) los umbrales y
> principios declarados en [`backend-standards.md`](backend-standards.md) y
> [`frontend-standards.md`](frontend-standards.md).

## 1. Por qué este doc existe

Los Tickets 1-3 dependen de que el propio agente IA (o un revisor humano) aplique
las reglas SOLID con criterio. Esta es la **única capa que NO depende del buen
comportamiento del LLM**: rendimiento mecánico comprobado en CI que falla el
pipeline si se violan los umbrales numéricos del Ticket 1.

Para que CI corra Errcheck contra NestJS/ Angular / Astro, los proyectos
instanciados desde este template copian los templates de configuración de
`templates/ci/` y los integran a su `package.json` y `.github/workflows/`.

## 2. Cobertura mecánica por principio SOLID

| Principio | Mecánicamente verificable? | Herramienta | Archivo de configuración |
|---|---|---|---|
| **DIP** | ✅ Sí, regla directa | `dependency-cruiser` | `templates/ci/.dependency-cruiser.js` rule `no-infra-from-domain`, `no-orm-or-http-from-domain` |
| **SRP** (umbrales) | ✅ Sí, vía tamaño + complejidad | ESLint + `eslint-plugin-sonarjs` | `templates/ci/eslintrc.backend.js`, `eslintrc.frontend.js`, `eslintrc.astro.js` |
| **OCP** | ⚠️ No directamente | — | Lente Architect (Ticket 3 §Fase 8) |
| **LSP** | ⚠️ No directamente | — | Lente Architect (Ticket 3 §Fase 8) |
| **ISP** | ⚠️ No directamente | — | Lente Architect (Ticket 3 §Fase 8) |

**Honest limitation:** la verificación estática solo puede medir **DIP** (regla
mecánica directa via dependency-cruiser) y **umbrales numéricos** de SRP
(líneas / complejidad). OCP/LSP/ISP son juicios arquitectónicos que el Lente
Architect del Ticket 3 debe hacer en code review. **Lint no sustituye al review.**

## 3. Mapeo de umbrales — Ticket 1 ↔ configs

| Umbral | Fuente (Ticket 1) | Config Ticket 4 |
|---|---|---|
| Backend: máx **300 líneas** por archivo de clase | `backend-standards.md` §_Umbrales objetivos_ | `eslintrc.backend.js` → `max-lines: ["error", 300]` |
| Backend: complejidad ciclomática máx **10 por método** | `backend-standards.md` §_Umbrales objetivos_ | `eslintrc.backend.js` → `complexity: ["error", 10]` |
| Backend: complejidad cognitiva máx **10** | *(medida adicional, alineada al ticket)* | `eslintrc.backend.js` → `sonarjs/cognitive-complexity: ["error", 10]` |
| Backend: DIP — `domain/`/`application/` → no importan infraestructura / ORM / HTTP | `backend-standards.md` §_Estructura carpetas_ | `.dependency-cruiser.js` rules `no-infra-from-domain`, `no-orm-or-http-from-domain` |
| Angular: máx **400 líneas** por archivo de componente (`.ts`) | `frontend-standards.md` §_Umbrales_ | `eslintrc.frontend.js` → `max-lines: ["error", 400]`, `@angular-eslint/component-class-size` |
| Astro: máx líneas | *(no fijado en Ticket 1)* | `eslintrc.astro.js` → `max-lines: ["warn", 400]` → **flagged como `warn`** hasta que un ticket futuro fije el umbral en `frontend-standards.md` |
| Backend: máx **3 parámetros por constructor** | `backend-standards.md` §_Umbrales objetivos_ | **No enforceable mechánicamente** — no existe un rule stable de ESLint para ello. Lente Architect lo cubre. |

## 4. Discrepancias con el Ticket 1 (honestas, sin invención)

1. **Astro máx líneas**: el Ticket 1 no fija un número para `.astro`
   (solo dice "extraer template inline > 60-80 líneas"). Uso `["warn", 400]` por
   defecto alineado al umbral Angular, marcado `warn` (no `error`) hasta que se
   documente explícitamente.
2. **Cyclomatic vs cognitive complexity**: el ticket habla de "complejidad
   ciclomática 10". ESLint `complexity` mide ciclomática;
   `sonarjs/cognitive-complexity` mide complejidad cognitiva (concepto distinto
   pero relacionado). Activamos **ambas** porque una función con ciclomática
   baja puede tener cognitiva alta (if anidados en else if).
3. **Máx 3 parámetros por constructor**: el Ticket 1 lo enumera pero no existe
   un rule ESLint estable para cubrirlo a día de hoy. Lente Architect lo cubre
   manualmente.
4. **OCP, LSP, ISP**: no son medibles por lint estático. Solo DIP y umbrales lo
   son. Esta limitación es estructural y se documenta aquí para no generar
   falsas expectativas.

## 5. Cómo instanciar en un proyecto real

```bash
# Desde la raíz de tu proyecto Specboot-instanciado:
cp templates/ci/eslintrc.backend.js     .eslintrc.backend.js
cp templates/ci/eslintrc.frontend.js    .eslintrc.frontend.js
cp templates/ci/eslintrc.astro.js       .eslintrc.astro.js
cp templates/ci/.dependency-cruiser.js  .dependency-cruiser.js
cp templates/ci/.madge.config.json      .madge.config.json

# Merge devDeps (ver templates/ci/package.ci.json para versiones):
node -e "const p=require('./package.json'); p.devDependencies=require('./templates/ci/package.ci.json').devDependencies; require('fs').writeFileSync('./package.json', JSON.stringify(p,null,2))"

npm install
```

El workflow `.github/workflows/ci.yml` ya incluye un job `solid-lint` que corre
estas herramientas **si y solo si existe un `package.json`** (protección via
`if: hashFiles('package.json') != ''`). El template Metadoc (sin código) no lo
dispara; un proyecto real con `package.json` lo corre automáticamente.

## 6. Snippet del job CI

```yaml
solid-lint:
  name: SOLID / POO Static Analysis
  runs-on: ubuntu-latest
  if: hashFiles('package.json') != ''
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
    - run: make install
    - name: Backend ESLint (sonarjs + SRP thresholds)
      run: make solid-lint
    # NOTA DEFERIDA — Python/Django/LangChain:
    # cuando se active el stack Python (ticket separado), agregar aquí un step:
    #   - name: Python lint (ruff + import-linter)
    #     run: |
    #       pip install ruff import-linter
    #       ruff check .
    #       lint-imports
    # import-linter debe prohibir que views.py importe directo del ORM saltándose
    # la capa de services.py (ver docs/backend-standards.md nota diferida).
```

## 7. Verificación local

El test [`tests/solid-templates-test.sh`](../tests/solid-templates-test.sh)
valida — **sin instalar npm ni ejecutar ESLint** (imposible en un repo sin
código) — que los templates existen, contienen los números correctos de los
umbrales del Ticket 1, llevan comentarios SOLID explícitos y que el job
`solid-lint` está condicionado correctamente.

## 8. Fuera de alcance

- Stack Python real (`ruff`/`pylint` + `import-linter`: solo nota YAML diferida).
- Artefactos de Tickets 1-3 (docs de estándares, agents, code-auditing Fase 8):
  este doc los referencia, no los modifica.
- `opencode.json.instructions[]`: este doc se carga bajo demanda, no siempre.
