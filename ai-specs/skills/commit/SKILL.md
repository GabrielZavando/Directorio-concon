# Skill: commit

## Description

Creates semantic commits following Conventional Commits and manages Pull Requests when finishing an OpenSpec change. This skill is **token-light**: uses `git diff --stat` and `git status --short` instead of reading the full diff, and groups changes by path patterns rather than analyzing content.

**Use after:** `/verify` passes (or user confirms verify was run). If `/adversarial-review` was used, confirm it passed before committing.

**Reference:** For Conventional Commits format, allowed types, semver, and commitlint configuration, see `ai-specs/reference/commits.md`.

---

## Step 1 — Extraer contexto del cambio (token-light)

Obtener el cambio activo:

- `ls openspec/changes/` y tomar el único cambio presente. Si hay varios, listar nombres y pedir al usuario cuál commitear.
- Leer el `TICKET-ID` y el `derived-name` desde `proposal.md` (header `Ticket ID:`). Si no existe, intentar leerlo de `openspec/tickets/{derived-name}-enriched.md` (solo el nombre de archivo, no su contenido).
- **No** leer `scenarios.md`, `requirements.md` ni `tasks.md` en su contenido completo.

---

## Step 2 — Gateway de verify (suave, sin estado persistido)

Dado que `/verify` no persiste `.verify-passed` (decisión previa), el gate es **suave**:

1. Preguntar al usuario: **"¿Ejecutaste `/verify` y pasó para este cambio?"**
2. Si el usuario responde **"no"**:
   - Ofrecer: (a) re-ejecutar `/verify` ahora (subproceso), o (b) abortar.
   - **No continuar sin confirmación.**
3. Si el usuario indica que usó `/adversarial-review` → pedir confirmación de que pasó.
4. Si no se usó `/adversarial-review` → continuar sin bloqueos.

**Nota:** No depender de archivo `.verify-passed` (déjálo como decisión previa de `/verify`).

---

## Step 3 — Validación de rama (solo advertir)

- `git branch --show-current`.
- Si la rama actual **no** coincide con `feature/*` → imprimir advertencia:
  ```
  ⚠️ Rama actual '{branch}' no sigue la convención feature/.
  ¿Continuar de todos modos?
  ```
- **Preguntar al usuario**; **no abortar ciegamente** (el proyecto puede usar otra convención).

---

## Step 4 — Diff selectivo (prop. 3.7)

- `git status --short` y `git diff --stat` (stageados + no stageados). **Nunca** `git diff` completo.
- Detectar grupo ya stageado por `/archive`: archivos bajo `openspec/` → tratar como commit `chore(specs): archive {TICKET-ID} ({derived-name})` (reutilizar el mensaje sugerido por archive Step 6).
- Agrupación lógica por patrones de ruta:
  - `tests/` → `test(...)`
  - `src/`/`app/` → `feat|fix|refactor(...)` 
  - `docs/` → `docs(...)`
  - `package.json`/`pyproject.toml`/`*.config.*` → `chore|ci(...)`
- **No** "adivinanza" sobre contenido; agrupar por ruta.

---

## Step 5 — Plan de commits + confirmación (prop. 3.2)

Imprimir tabla con el plan propuesto:

```
  #  Archivos                                   Mensaje sugerido
  1  openspec/...                                chore(specs): archive PROJ-123 (auth-reset)
  2  tests/...                                   test(auth): add password reset tests
  3  src/...                                     feat(auth): implement password reset flow
```

Usar plantilla estructurada (Conventional Commits):

```
<tipo>(<ámbito>): <asunto en presente>

<cuerpo opcional — qué y por qué, no cómo>

<footer opcional: Closes #TICKET-ID, BREAKING CHANGE: ...>
```

- **Preguntar al usuario: "¿Aprobás este plan de commits?"**  **Antes** de cualquier `git add`/`git commit`.

---

## Step 6 — Ejecutar commits (solo tras aprobación)

Por cada grupo aprobado:

```
git add <archivos>
git commit -m "<mensaje Conventional Commit>"

Incluir `Closes #{TICKET-ID}` solo en el commit principal (no en todos).
```

Si el usuario no aprueba algún grupo → omitirlo y seguir con el resto.

---

## Step 7 — Push + PR (confirmación explícita, prop. 3.2/3.6)

- **No** ejecutar `git push` ni `gh pr create` sin confirmación del usuario.
- Pre-PR: `git fetch origin main` y verificar `git merge-base --is-ancestor origin/main HEAD` → si no, avisar:
  ```
  ⚠️ La rama no está actualizada con main
  ```
- `gh pr create` solo tras aprobación; usar `.github/pull_request_template.md` si existe; título conventional + cuerpo con referencia al change.