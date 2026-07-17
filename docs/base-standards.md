---
description: Reglas globales de desarrollo para agentes IA (OpenCode). Aplica siempre.
alwaysApply: true
---

# Base Standards — Agencia Zavando

## 1. Principios core

- **Pasos pequeños, uno a la vez**: Nunca avanzar más de un paso sin confirmar. Baby steps siempre.
- **TDD (Test-Driven Development)**: Escribir test fallido primero para cualquier funcionalidad nueva.
- **Tipado completo**: Todo el código debe estar completamente tipado (TypeScript, PHPDoc, etc.).
- **Nombres descriptivos**: Variables y funciones con nombres claros y específicos al dominio.
- **Cambios incrementales**: Preferir modificaciones pequeñas y revisables sobre cambios grandes.
- **Cuestionar supuestos**: Siempre preguntar ante ambigüedades antes de asumir.
- **Detectar patrones repetidos**: Identificar y señalar código duplicado o patrones que deben abstraerse.

## 2. Idioma del código

- **Todo en inglés**: Variables, funciones, clases, comentarios, mensajes de error, logs.
- **Documentación en español**: READMEs para el cliente, comentarios de negocio, tickets pueden ir en español.
- **Commits en inglés**: Siempre. Conventional commits format.
- **Nombres de base de datos en inglés**: Tablas, columnas, índices.

## 3. Estándares específicos por área

Para estándares detallados, leer los archivos correspondientes:

- [Backend Standards](docs/backend-standards.md) — API, base de datos, testing, seguridad
- [Frontend Standards](docs/frontend-standards.md) — Componentes, UI/UX, estado
- [Documentation Standards](docs/documentation-standards.md) — Estructura docs, OpenAPI, mantenimiento

## 4. Skills del proyecto

- Los skills viven en `ai-specs/skills/`.
- Cuando una solicitud coincida con la descripción de un skill, cargar y seguir el `SKILL.md` correspondiente automáticamente antes de continuar.
- Cargar también los archivos referenciados en la carpeta del skill cuando el skill los requiera.
- La lista de skills disponibles y sus triggers está en `AGENTS.md` (se carga junto con este archivo). Para descripciones extendidas, ver [`ai-specs/README.md`](../ai-specs/README.md).

## 5. Modelo de planning

Los flujos de planning se ejecutan mediante los custom commands definidos en `opencode.json`:

- `/enrich-us` — Enriquecer user story vaga antes de planificar
- `/plan-change` — Generar OpenSpec specs y tasks a partir de un ticket
- `/apply` — Implementar tareas desde los artefactos OpenSpec (TDD)
- `/verify` — Validar implementación contra escenarios OpenSpec
- `/adversarial-review` — Auditoría sistemática de calidad
- `/archive` — Archivar artefactos OpenSpec al completar
- `/commit` — Crear commits convencionales y PR

El modelo para cada agente está definido en `opencode.json`. No hardcodear modelos aquí.

## 6. Orquestación con OpenCode (fuente canónica)

- **OpenCode es la única herramienta objetivo** de este template. No se generan
  symlinks ni configuraciones para Claude Code (`.claude/`) ni Cursor (`.cursor/`).
- **Fuente canónica**: Los artefactos reutilizables (agentes y skills) viven en
  `ai-specs/`. OpenCode los consume directamente mediante referencias
  `{file:...}` declaradas en `opencode.json`.
- **Un cambio es incompleto** si deja referencias `{file:...}` rotas o artefactos
  canónicos duplicados.
- **Seguridad al renombrar**: Al renombrar o mover un archivo dentro de `ai-specs/`,
  verificar y actualizar todas las referencias `{file:...}` que lo apuntan (usar
  `bash check-refs.sh`) antes de cerrar el cambio.
- **Nuevos artefactos**: Al crear un nuevo skill o agente en `ai-specs/`, añadir su
  referencia `{file:...}` donde corresponda en `opencode.json` y registrarlo en
  `ai-specs/README.md`.
- `specboot.sh` valida la estructura, los placeholders y la integridad referencial
  (`check-refs.sh`); no crea symlinks porque el template es OpenCode-only.

## 7. Actualización de artefactos OpenSpec ante cambios post-apply

Si aparece un fix o cambio nuevo después de `/apply` y antes de `/archive`:

1. Actualizar primero los artefactos OpenSpec afectados (scenarios, requirements, tasks.md)
2. Si se necesita regenerar artefactos, ejecutar el paso OpenSpec correspondiente antes de codear
3. Solo implementar código después de que los artefactos reflejen el nuevo requerimiento
4. Re-ejecutar verificación contra artefactos actualizados antes de archivar

**No aplicar fixes directos en código sin actualizar OpenSpec primero.**

## 8. Contexto del proyecto (personalizar por proyecto)

> ⚠️ Esta sección DEBE ser actualizada al iniciar cada proyecto nuevo.

```
Stack:
  Backend:  Node.js 22 (>=20.19) + NestJS 10 + TypeScript 5
  BaaS:      Firebase (Firestore, Authentication, Storage) vía Firebase Admin SDK
  Frontend: Angular 17+ + TailwindCSS (futuro, mismo monorepo)
Arquitectura: REST API modular (NestJS) por capas: controllers / services / DTOs / guards / interceptors
Dominio: Directorio de Empresas de Concón — plataforma para descubrir y gestionar
         negocios locales en Concón, Chile. CRUD de empresas, categorías, barrios,
         usuarios, auth, planes premium, reviews e IA.
Cliente: Agencia Digital (https://agencia-digital.cl)
Convenciones de commits: Conventional Commits
Lenguaje del código: English
Lenguaje de documentación cliente: Español
Deploy: VPS (Docker) — ver docs/deploy-standards.md
Monorepo: backend/ (API NestJS) + frontend/ (Angular, futuro)
```

### 8.1 Fuentes de contexto del proyecto (ya documentadas)

El dominio, modelo de datos y convenciones ya están descritos en `.github/instructions/`:
- `.github/instructions/backend-instructions.md` — guía backend NestJS
- `.github/instructions/database-instructions.md` — estructura Firestore e índices
- `.github/instructions/frontend-instructions.md` — guía frontend Angular
- `.github/instructions/ai-instructions.md` — funcionalidades de IA
- `.github/instructions/deployment-instructions.md` — despliegue (deprecado por VPS/Docker)

`docs/data-model.md` y `docs/api-spec.yml` son la fuente canónica sincronizada con Specboot.
