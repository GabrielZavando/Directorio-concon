/**
 * Injection tokens for the Usuario repository.
 *
 * Used by `UsuariosService` to depend on the abstraction (via
 * `@Inject(USUARIOS_REPOSITORY)`) instead of a concrete adapter.
 *
 * Mirror the `EVENTO_REPOSITORY` / `EVENTO_READ_REPOSITORY` /
 * `EVENTO_WRITE_REPOSITORY` triple from the `eventos` module for
 * cross-module symmetry.
 *
 * Tokens are plain strings (not Symbols) — consistent with the project's
 * existing NestJS DI convention (`EVENTO_REPOSITORY` is a `const string`).
 */

/** Combined read+write repository token. Binds to `UsuarioRepositoryInterface`. */
export const USUARIOS_REPOSITORY = "UsuariosRepositoryInterface";

/** Read-only repository token (ISP segregation for read-only consumers). */
export const USUARIOS_READ_REPOSITORY = "UsuariosReadRepositoryInterface";

/** Write-only repository token (ISP segregation for write-only consumers). */
export const USUARIOS_WRITE_REPOSITORY = "UsuariosWriteRepositoryInterface";
