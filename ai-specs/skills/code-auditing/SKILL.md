# Skill: code-auditing

## Descripción

Auditoría sistemática de calidad de código en 7 fases. Usar antes de releases importantes, durante revisiones de deuda técnica, o como `/adversarial-review` en el flujo SDD.

## Proceso — 7 fases

### Fase 1: Seguridad

- Inputs sin sanitizar o validar
- Credenciales hardcodeadas o expuestas
- SQL injection, XSS, CSRF posibles
- Permisos y autenticación correctamente aplicados
- Datos sensibles logueados

### Fase 2: Tipos y contratos

- Tipos `any` o `unknown` sin justificación
- Props/parámetros sin tipo explícito
- Contratos de API que no coinciden con `docs/api-spec.yml`
- Interfaces inconsistentes entre capas

### Fase 3: Performance

- N+1 queries en base de datos
- Operaciones síncronas bloqueantes en el main thread
- Recursos sin liberar (listeners, connections, timers)
- Carga de datos innecesaria (over-fetching)

### Fase 4: Código muerto y duplicación

- Funciones, componentes o módulos no referenciados
- Código duplicado que puede abstraerse
- Imports no usados
- Feature flags obsoletos

### Fase 5: Best practices de librerías

- Uso desactualizado de APIs de librerías
- Patrones deprecated
- Dependencias con vulnerabilidades conocidas (`npm audit`)

### Fase 6: Tests

- Casos edge no cubiertos
- Tests que prueban implementación en vez de comportamiento
- Mocks que ocultan bugs reales
- Cobertura por debajo del mínimo definido

### Fase 7: OpenSpec Alignment

- El código implementado coincide con los escenarios en `.openspec/<change>/scenarios.md`
- Los requirements en `.openspec/<change>/requirements.md` están cubiertos
- Las tareas en `tasks.md` están completadas o actualizadas
- El contrato en `docs/api-spec.yml` refleja los cambios reales
- El modelo de datos en `docs/data-model.md` está sincronizado

## Output esperado

```markdown
## Reporte de auditoría — [módulo/PR]

### Hallazgos críticos (bloquean el merge)
- [ ] [descripción del hallazgo]

### Hallazgos importantes (resolver en siguiente sprint)
- [ ] [descripción del hallazgo]

### Sugerencias (mejora de calidad)
- [ ] [descripción de sugerencia]

### Cobertura actual: X%
```
