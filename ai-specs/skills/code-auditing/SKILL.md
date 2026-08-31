# Skill: code-auditing

## Descripción

Auditoría adversarial de calidad de código. Ejecútala antes de archivar un cambio para detectar fallos costosos, peligrosos o difíciles de detectar. **No duplica `/verify`** (este se encarga de la cobertura de requisitos y tareas); este paso se enfoca en robustez, seguridad ofensiva, tradeoffs y diseño contextual. **Read-only**: reporta hallazgos, nunca modifica código.

## Paso 1 — Cargar contexto del cambio (token-light)

- `ls openspec/changes/` → cambio activo. Si hay varios, pedir al usuario cuál auditar.
- Leer `proposal.md` (el "por qué" y el "qué" del cambio).
- `git diff --stat` → lista resumida de archivos modificados.
- **No** leer `scenarios.md`/`requirements.md`/`tasks.md` completos (eso es `/verify`).

## Paso 2 — Ejecutar herramientas automáticas

- `npm audit --json` (si existe `package.json`) → parsear vulnerabilidades reales de dependencias.
- `npx eslint -c templates/ci/eslintrc.backend.js --format json src/` y, según corresponda, `templates/ci/eslintrc.frontend.js` o `templates/ci/eslintrc.astro.js` → parsear violaciones SRP (`max-lines`, `max-params`), DIP, ISP.
- `npx dependency-cruiser --config templates/ci/.dependency-cruiser.js src/` → validar regla `no-infra-from-domain` (ningún archivo en `domain/` o `application/` importe infraestructura).
- **Pasar los JSON resultantes al LLM para interpretar y priorizar**, no para leer código línea por línea.
- Si algún config no existe (`templates/ci/*.js` no presentes), saltar ese paso e informar.

## Paso 3 — Lente adversarial (red-team)

Prompt único dentro del mismo agente (no subagents paralelos):

> **"Eres reviewer escéptico. Tu único trabajo es encontrar las razones más sólidas por las que este cambio NO debería archivarse. Busca fallos que sean costosos, peligrosos o difíciles de detectar. No busques validar, rompe."**

Ejes a cubrir (lo que `/verify` NO cubre):
- **Seguridad ofensiva**: ¿cómo lo atacaría un adversario? (input sin sanitizar, credenciales en logs, bypass de auth).
- **Robustez ante fallos**: ¿qué pasa si la base de datos cae? Si el servicio externo retorna error? Si el input está vacío.
- **Tradeoffs**: ¿se consideraron alternativas? ¿por qué se eligió esta solución sobre otras? ¿es la idónea para el dominio de negocio?
- **SOLID contextual**: usar los outputs de eslint/dependency-cruiser de Step 2 como evidencia; no conteo manual de líneas.

**Auto-refutación**: por cada hallazgo crítico, intentar refutarlo: *"¿es real o falso positivo?"*. Eliminar los que no sobrevivan.

## Paso 4 — Diff selectivo

- Para los archivos modificados, leer **solo los hunks** (`git diff -- <file>`), no el archivo entero. Aplicar el lente adversarial ahí.

## Paso 5 — Veredicto estructurado

Imprimir un bloque YAML compacto (solo pantalla, no persistido):

```yaml
verdict: SHIP | NO-SHIP
confidence: 0.0-1.0
findings:
  - severity: CRITICAL|WARNING|INFO
    category: security|robustness|solid|tradeoff|tests
    file: ruta:línea
    evidence: "..."
    recommendation: "..."
summary:
  total_findings: N
  critical: N
  warnings: N
  info: N
```

Mostrar al usuario solo `verdict` + `summary`; los detalles expandibles están disponibles si se solicita.

## Paso 6 — Detección de cambios ya stageados por /archive (compatibilidad)

- Si `openspec/state/manifest.json` existe y lista archivos en `openspec/archive/`, **no vuelva a auditarlos**. Reportarlos como *"archivados anteriormente, sin nuevos hallazgos"* y enfocarse solo en código nuevo.

---
**Eliminado**: la Fase 7 (OpenSpec Alignment) ha sido removida (cubre `/verify`). Esta skill ahora se enfoca únicamente en auditoría adversarial: robustez, seguridad, tradeoffs y diseño contextual.