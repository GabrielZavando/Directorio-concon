/**
 * User role enumerable for the Directorio de Concón.
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
 * This enum is introduced by the `roles-rename` change as a reusable
 * domain artefact for the future `auth + usuarios` change's `RolesGuard`
 * and any DTO that validates role-typed input. Pure TypeScript, zero
 * framework imports (DIP).
 *
 * Migration note: the rename is schema-only — the `usuarios` collection is
 * empty (the `UsuariosModule` is not yet implemented), so there is no data
 * migration. Registrations post-`auth + usuarios` start with the new values
 * directly (default `'member'`).
 */
export type Rol = "admin" | "owner" | "member";

/**
 * Closed `as const` tuple consumed by `class-validator`'s `@IsEnum` decorator
 * in DTOs of the future `auth + usuarios` module:
 *
 * ```ts
 * import { IsEnum } from "class-validator";
 * import { ROL_VALUES, Rol } from "@/modules/usuarios/domain/rol.enum";
 *
 * @IsEnum(ROL_VALUES, { message: "rol must be one of: admin, owner, member" })
 * declare readonly rol: Rol;
 * ```
 *
 * Order is intentional: `admin` first (operator precedence predicate),
 * `member` last (registration default per `docs/data-model.md §usuarios`).
 */
export const ROL_VALUES = ["admin", "owner", "member"] as const;
