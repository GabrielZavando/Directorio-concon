/**
 * Injection token for `AuthContextRepository`.
 *
 * Binds the abstract repository (defined in `domain/`) to its concrete
 * Firestore implementation (`infrastructure/usuarios-rol-lookup.adapter.ts`).
 *
 * Plain string token — consistent with the project's NestJS DI convention
 * (`USUARIOS_REPOSITORY`, `EVENTO_REPOSITORY`, etc.).
 */
export const AUTH_CONTEXT_REPOSITORY = "AuthContextRepository";
