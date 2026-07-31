/**
 * AuthModule — wires the production auth surface (Task 7 + Task 8).
 *
 * Providers:
 *  - `AuthService` — wraps `FirebaseService.verifyIdToken` + the
 *    `Rol` resolver (custom claim → Firestore fallback → canonical
 *    403 for orphans). Consumed by `JwtAuthGuard` at runtime.
 *  - `JwtAuthGuard` (production, replaces the Task 4 stub) — reads the
 *    `Authorization: Bearer <token>` header, runs `AuthService`, and
 *    attaches `request.user = AuthContext`.
 *  - `RolesGuard` (production, replaces the Task 4 stub) — reads
 *    `@Roles(...)` metadata and gates on `request.user.rol`.
 *  - `AUTH_CONTEXT_REPOSITORY` bound to `UsuariosRolLookupAdapter`
 *    (Task 6) — single Firestore read on `usuarios/{uid}` to resolve
 *    the stored `Rol`. The application layer (`AuthService`) depends
 *    on the abstract interface and is bound through this token (DIP).
 *
 * Exports `JwtAuthGuard` and `RolesGuard` so other modules can apply
 * them via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
 * `AuthService` is exported for completeness and for the future Task 14
 * e2e that may need to inject it directly.
 *
 * No `APP_GUARD` global registration — controllers opt-in by decorating
 * with `@UseGuards` (see `tasks.md` 8.2). Public endpoints omit the
 * decorators entirely.
 */
import { Module } from "@nestjs/common";
import { AuthService } from "./application/auth.service";
import { JwtAuthGuard } from "./application/jwt-auth.guard";
import { RolesGuard } from "./application/roles.guard";
import { AUTH_CONTEXT_REPOSITORY } from "./domain/auth-context-repository.token";
import { UsuariosRolLookupAdapter } from "./infrastructure/usuarios-rol-lookup.adapter";

@Module({
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: AUTH_CONTEXT_REPOSITORY,
      useClass: UsuariosRolLookupAdapter,
    },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
