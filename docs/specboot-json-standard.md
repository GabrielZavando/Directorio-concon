# `.specboot.json` Standard — Esquema y validación (Specboot)

Este documento es el **estándar canónico** del archivo de configuración de proyecto
`.specboot.json`. Es un documento del framework (intocable para el dev del proyecto),
distribuido con `@gabrielzavando/specboot`. Amplía `docs/framework-contract.md`
(que declara que `.specboot.json` es **del proyecto**) y `docs/docs-standard.md`
(que define la carpeta `docs/` y el campo `extraStandards`).

## 1. Propósito

`.specboot.json` declara al framework, por proyecto:

- Qué **versión del framework** requiere el proyecto (`frameworkVersion`).
- Qué **servicios** lintear/validar (`services`).
- Qué **stack(s)** usa el proyecto, para seleccionar linters (`stack`).
- Metadatos opcionales de proyecto y estándares `docs/` extra a cargar
  (`name`, `description`, `extraStandards`).
- Metadatos opcionales de nomenclatura de capas por servicio (`layers`), usados
  por el skill `plan-change` (Step 5) para etiquetar capas y `Suggested Path`/`Test Path`.

El framework valida este archivo con `validate-specboot.sh` (ver §5). Los comandos
que *consumen* el archivo (`specboot init`, `specboot update`, el Makefile de Fase 5)
se implementan en fases posteriores; este estándar solo define el esquema y la
validación.

## 2. Esquema canónico

```json
{
  "frameworkVersion": "0.1.1",                  // requerido, SemVer del framework requerido
  "name": "directorio-concon",                  // opcional, nombre del proyecto
  "description": "Directorio de negocios",      // opcional, descripción libre
  "services": ["backend", "frontend"],          // requerido, rutas relativas a los servicios
  "stack": ["node", "python"],                  // requerido, string o array de stacks
  "extraStandards": ["docs/client-rules.md"],  // opcional, rutas de docs/ extra a cargar
  "layers": {                                   // opcional, mapa servicio -> [capas]
    "backend": ["domain", "application", "infrastructure"],
    "frontend": ["smart", "dumb"]
  }
}
```

### 2.1 Campos requeridos

| Campo | Tipo | Regla |
|-------|------|-------|
| `frameworkVersion` | string (SemVer `MAJOR.MINOR.PATCH`) | Versión del framework que el proyecto requiere. Debe coincidir (por comparación SemVer) con la versión instalada del paquete `@gabrielzavando/specboot` (ver TICKET-0.4 para qué constituye un salto de versión). |
| `services` | array de strings | Rutas relativas (desde la raíz del proyecto) a las carpetas que contienen código del proyecto. `"."` denota la raíz misma (mono-repo sin subcarpetas). Usado por el Makefile del framework (Fase 5) para saber qué lintear. Cada entrada debe ser una ruta existente. |
| `stack` | string **o** array de strings | Stack(s) del proyecto. Determina qué linters/validaciones aplica el framework: `node` → eslint/dependency-cruiser/madge; `python` → ruff/import-linter; `framework` → solo validación del propio Specboot (dogfooding). |

### 2.2 Campos opcionales

| Campo | Tipo | Regla |
|-------|------|-------|
| `name` | string | Nombre legible del proyecto. Solo metadato. |
| `description` | string | Descripción libre del proyecto. Solo metadato. |
| `extraStandards` | array de strings | Rutas relativas (desde la raíz) de archivos `docs/` adicionales que el agente debe cargar según la tarea. Deben vivir bajo `docs/` (ver `docs/docs-standard.md`). |
| `layers` | object | **Opt-in, del proyecto.** Mapa donde cada clave es una entrada de `services` y cada valor es un array de etiquetas de capa (o un string separado por ` | `). Documenta la nomenclatura de capas por servicio para que el skill `plan-change` etiquete tareas y `Suggested Path`/`Test Path`. Si se omite, `plan-change` usa las etiquetas por defecto según `stack` (backend: `domain | application | infrastructure`; frontend: `smart | dumb`). El validador solo exige que, de estar presente, sea un objeto; no valida profundamente su contenido. |

## 3. Semántica por campo (detalle)

- **`frameworkVersion`**: formato SemVer estricto. La versión instalada se resuelve
  (en orden) desde: (1) `specboot.sh --version`; (2)
  `node_modules/@gabrielzavando/specboot/package.json`; (3) el `package.json` de la
  raíz del repo (caso dogfooding, donde el repo es el propio framework). La comparación
  define el comportamiento de validación (§5).
- **`services`**: no debe estar vacío. `"."` es válido y significa "la raíz del
  repositorio contiene el código". Rutas que no existen en el proyecto son error.
- **`stack`**: acepta `"node"`, `"python"`, `"framework"`, o combinaciones en array.
  Define qué herramientas de validación corren.
- **`extraStandards`**: apunta a `docs/` del proyecto; es la válvula de extensión de
  contexto sin tocar los estándares base del framework.
- **`layers`**: es metadato puro de nomenclatura; no afecta la validación de
  configuración, solo la generación de specs por `plan-change`.

## 4. Ejemplos

### 4.1 Mono-repo con un servicio en la raíz (el propio Specboot)
```json
{
  "frameworkVersion": "0.1.1",
  "name": "specboot",
  "description": "SDD framework boilerplate (Specboot)",
  "services": ["."],
  "stack": "framework"
}
```

### 4.2 Multi-servicio, multi-stack (node + python)
```json
{
  "frameworkVersion": "0.1.1",
  "name": "directorio-concon",
  "description": "Directorio de negocios",
  "services": ["backend", "frontend"],
  "stack": ["node", "python"],
  "extraStandards": ["docs/client-rules.md"],
  "layers": {
    "backend": ["domain", "application", "infrastructure"],
    "frontend": ["smart", "dumb"]
  }
}
```

### 4.3 Servicio único node con capas por defecto omitidas
```json
{
  "frameworkVersion": "0.1.1",
  "services": ["src"],
  "stack": "node"
}
```

## 5. Comportamiento de validación (`validate-specboot.sh`)

El script `validate-specboot.sh` (en la raíz del framework, inyectado al proyecto)
implementa la siguiente lógica. Códigos de salida: `0` = correcto o solo advertencias;
`1` = error bloqueante.

1. **Archivo ausente**: si `.specboot.json` no existe en la raíz → imprime
   `⚠️ .specboot.json no encontrado. Corre 'specboot init' para crearlo.` y **exit 0**
   (no bloquea; es advertencia). `specboot init` se implementa en Fase 3.
2. **JSON inválido**: si el contenido no es JSON válido → error y **exit 1**.
3. **Campos requeridos faltantes**: si falta `frameworkVersion`, `services` o `stack`
   → error listando cuáles y **exit 1**.
4. **Comparación de versión** (resuelta como en §3):
   - `frameworkVersion` **mayor** que la instalada → error
     `"proyecto requiere versión más nueva del framework"` y **exit 1**.
   - `frameworkVersion` **menor** que la instalada → warning
     `"framework desactualizado, corre specboot update"` y **exit 0**.
   - Igual → pass.
5. **Rutas de `services`**: cada entrada debe existir como ruta (`.` = raíz). Si alguna
   no existe → error y **exit 1**.
6. **`layers`** (si presente): debe ser un objeto; de lo contrario error y **exit 1**.
   No se valida en profundidad.

Imprime un resumen y sale con el código correspondiente. Si `node` no está disponible,
el script valida lo que puede (presencia, JSON, campas, rutas) y omite la comparación de
versión con un warning no bloqueante.

## 6. Relación con el contrato del framework

Este estándar concreta, para `.specboot.json`, la frontera global intocable/del
proyecto declarada en `docs/framework-contract.md`: `.specboot.json` es **del proyecto**
(lo edita el dev), mientras que `validate-specboot.sh`, `specboot.sh` y este documento
son **intocables** (los inyecta/actualiza el framework vía `specboot update`). El
formato de `extraStandards` respeta `docs/docs-standard.md` (todo extra vive bajo `docs/`).
