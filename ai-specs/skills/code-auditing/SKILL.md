# Skill: code-auditing

## Descripción

Auditoría sistemática de calidad de código. Usar antes de releases importantes, durante revisiones de deuda técnica, o como `/adversarial-review` en el flujo SDD.

## Proceso

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

### Fase 8: SOLID/POO — Lente Architect

Chequeo explícito, ítem por ítem, contra el diff bajo revisión. Umbrales de referencia: `docs/backend-standards.md` sección _Principios de Diseño — Backend (NestJS)_, y `docs/frontend-standards.md` secciones _Principios de Diseño — Frontend (Angular)_ y _Principios de Diseño — Astro_.

#### NestJS / Backend

- ¿Algún archivo en `domain/` o `application/` importa un paquete de infraestructura (TypeORM, Prisma, HTTP client, SDK externo)? → violación de DIP.
- ¿Algún `@Injectable()` mezcla acceso a datos + lógica de negocio + formateo de respuesta en la misma clase? → violación de SRP.
- ¿Hay algún `new` de una dependencia dentro de un constructor en vez de recibirla inyectada? → violación de DIP.
- ¿Se agregó una nueva rama `if/else`/`switch` a un método existente para soportar un nuevo caso, en vez de una Strategy/nueva implementación? → violación de OCP.
- ¿Alguna interfaz de puerto tiene más de 5 métodos donde el consumidor solo usa 1-2? → violación de ISP.
- ¿Alguna clase supera 300 líneas? → Esta violación **ahora es detectable automáticamente vía ESLint** (regla `max-lines` en `eslintrc.backend.js`). Si el lint reporta error, el agente debe validar el output y reportar el hallazgo; no es necesario estimar manualmente.
- ¿Alguna función tiene más de 5 parámetros en su constructor? → Esta violación **ahora es detectable automáticamente vía ESLint** (regla `max-params` en `eslintrc.backend.js`). Si el lint reporta error, el agente debe validar el output y reportar el contexto; no es necesario contar parámetros manualmente.

#### Angular

- ¿Un componente "dumb" inyecta un servicio de datos o llama HTTP directamente? → violación de SRP/capas.
- ¿Un componente mezcla lógica de presentación con lógica de negocio no trivial? → violación de SRP.
- ¿Un componente supera 400 líneas? → Esta violación **ahora es detectable automáticamente vía ESLint** (regla `max-lines` en `eslintrc.frontend.js`). Si el lint reporta error, el agente debe validar el output y reportar el hallazgo; no es necesario estimar manualmente.
- ¿Un constructor de componente tiene más de 5 parámetros? → Esta violación **ahora es detectable automáticamente vía ESLint** (regla `max-params` en `eslintrc.frontend.js`). Si el lint reporta error, el agente debe validar el output y reportar el contexto; no es necesario contar parámetros manualmente.

#### Astro

- ¿El frontmatter contiene lógica de negocio no trivial que debería vivir en un módulo `.ts` separado y testeable? → violación de SRP.

#### Formato de salida obligatorio por hallazgo

Cada hallazgo de esta fase debe reportarse en el formato accionable siguiente — no se acepta salida genérica tipo "viola SRP":

```
[Principio violado] — [Archivo:línea]
Qué se observa: [descripción concreta de lo que hace el código]
Por qué viola el principio: [explicación en 1 línea]
Refactor sugerido: [acción concreta, ej. "extraer el bloque de acceso a datos a un UserRepository inyectado vía IUserRepository"]
```

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