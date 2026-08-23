# Conventional Commits — Referencia

Este archivo es documentación de referencia humana. No se carga automáticamente en el contexto de los agentes.

## Formato

```
<type>(<scope>): <short description in English>

[optional body — what and why, not how]

[optional footer — BREAKING CHANGE, Closes #ticket]
```

## Tipos permitidos

| Type | When to Use |
| --- | --- |
| `feat` | New functionality for the user |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Refactor with no behavior change |
| `test` | Add or fix tests |
| `chore` | Build, dependencies, config |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `revert` | Revert previous commit |

## Ejemplos

```
feat(auth): add password reset endpoint

fix(orders): prevent duplicate submission on slow connections
Closes #SCRUM-42

docs(api): update payment endpoint spec with new error codes

refactor(user): extract email validation to shared util

test(auth): add integration tests for password reset flow

chore(deps): upgrade bcrypt from 5.0.1 to 5.1.0
```

## Semantic Versioning (semver)

- **MAJOR** (x.0.0): breaking changes
- **MINOR** (0.x.0): new features, backward compatible
- **PATCH** (0.0.x): bug fixes

## Commitlint y Husky

Configuración en `.commitlintrc.json` y `.husky/` para enforcing de conventional commits en pre-commit hooks.

Ver documentación oficial:
- Conventional Commits: https://www.conventionalcommits.org/
- Commitlint: https://commitlint.js.org/
- Husky: https://typicode.github.io/husky/