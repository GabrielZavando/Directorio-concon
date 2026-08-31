/**
 * User role enumerable for the Directorio de Concón.
 *
 * This enum lives in the `auth` module because `Rol` is fundamentally a
 * concept of authentication + authorization (used by `RolesGuard`,
 * `AuthContext`, `@Roles(...)`, JWT custom claims). The `usuarios`
 * module consumes the type — it does not own it. This placement matches
 * the project's DIP rule (`backend-standards.md`): the auth/security
 * concern lives in `auth/`, and `usuarios` depends on it.
 *
 * Three authenticated roles coexist (see `docs/base-standards.md §8.2`):
 * - `admin`  — system administrator: approves/rejects `solicitudes`,
 *              manages `categorias`/`barrios`, edits any place/event,
 *              toggles `destacado`/`verificado`.
 * - `owner`  — owns one `places` document (linked via `usuarios.placeId`)
 *              and may publish events with `eventos.usuarioId === token.uid`.
 *              Replaces the legacy `'empresa'` value.
 * - `member` — registered directory member with a basic profile; read-only
 *              public access; cannot `POST /places` nor `POST /eventos` (403).
 *              Replaces the legacy `'usuario'` value.
 *
 * The anonymous visitor (sin login) is NOT a `Rol` — it is an implicit
 * system role for the read-only discovery flow (Flujo 2) and is not
 * persisted in the `usuarios` collection.
 *
 * History: introduced by the `roles-rename` change at
 * `backend/src/modules/usuarios/domain/rol.enum.ts` (when the only
 * consumer was the future `auth + usuarios` module). Moved to
 * `backend/src/modules/auth/domain/rol.enum.ts` by the `auth + usuarios`
 * change so that `auth` owns its own domain — closing the
 * cross-module `import type` from `auth/domain/rol.ts` to
 * `usuarios/domain/rol.enum.ts` (which violated DIP: a security concern
 * depending on a business concern).
 *
 * Migration note: the rename is schema-only — the `usuarios` collection is
 * empty (the `UsuariosModule` was not yet implemented), so there is no data
 * migration. Registrations post-`auth + usuarios` start with the new values
 * directly (default `'member'`).
 *
 * Pure TypeScript, zero framework imports (DIP).
 */
export type Rol = "admin" | "owner" | "member";

/**
 * Closed `as const` tuple consumed by `class-validator`'s `@IsEnum` decorator
 * in DTOs that validate role-typed input (e.g., `UpdateRolDto`,
 * `CreateUsuarioDto`):
 *
 * ```ts
 * import { IsEnum } from "class-validator";
 * import { ROL_VALUES, Rol } from "@/modules/auth/domain/rol.enum";
 *
 * @IsEnum(ROL_VALUES, { message: "rol must be one of: admin, owner, member" })
 * declare readonly rol: Rol;
 * ```
 *
 * Order is intentional: `admin` first (operator precedence predicate),
 * `member` last (registration default per `docs/data-model/data-model.md §usuarios`).
 */
export const ROL_VALUES = ["admin", "owner", "member"] as const;
