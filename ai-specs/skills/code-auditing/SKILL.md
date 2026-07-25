# Skill: code-auditing

## Descripción

Auditoría sistemática de calidad de código en 8 fases. Usar antes de releases importantes, durante revisiones de deuda técnica, o como `/adversarial-review` en el flujo SDD.

## Proceso — 8 fases

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

### Fase 8: SOLID / POO — Lente Architect

Inspeccionar el diff con lupa para violaciones de principios SOLID y Composition over Inheritance. Reportar **solo** lo que aplica al stack del proyecto.

#### NestJS / Backend

- **DIP**: imports de `firebase-admin`, `class-validator`, `@nestjs/axios`, `@nestjs/axios`, HTTP clients o SDKs concretos en `domain/` o `application/`. Deben importar solo interfaces definidas en `domain/`.
- **SRP**: un `@Injectable()` que mezcla data access + business logic + formatting en un mismo archivo.
- **OCP**: `if/else` o `switch` crecientes que deberían ser estrategias/polimorfismo.
- **ISP**: interfaces de repositorio con más de 5 métodos.
- **SRP (archivos)**: archivos >300 líneas o cyclomatic complexity >10.

#### Angular / Frontend

- **SRP**: dumb component inyectando un data service (`HttpClient`, Firestore, store). Dumb components solo reciben inputs y emiten outputs.
- **SRP (archivos)**: archivos >400 líneas o inline templates >60–80 líneas.
- **DIP**: `new HttpClient()` en vez de `inject(HttpClient)`.

#### Astro

- **SRP**: frontmatter con lógica de negocio no trivial (debe ser solo fetch + props).

#### Output obligatorio de Fase 8

```
[Principio violado] — [Archivo:línea] / Qué se observa / Por qué viola / Refactor sugerido
```

Si no hay violaciones SOLID/POO en el diff, reportar: "Fase 8: sin violaciones SOLID/POO detectadas en este cambio."

## Output esperado

```markdown
## Reporte de auditoría — [módulo/PR]

### Hallazgos críticos (bloquean el merge)
- [ ] [descripción del hallazgo]

### Hallazgos importantes (resolver en siguiente sprint)
- [ ] [descripción del hallazgo]

### Sugerencias (mejora de calidad)
- [ ] [descripción de sugerencia]

### Fase 8 — SOLID / POO
- [violationes o "sin violaciones detectadas"]

### Cobertura actual: X%
```