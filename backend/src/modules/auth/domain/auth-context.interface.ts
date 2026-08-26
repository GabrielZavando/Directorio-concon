/**
 * Domain interface for the authenticated principal — `AuthContext`.
 *
 * Pure TypeScript, zero framework imports (DIP). Constructed by
 * `AuthService.buildContext(decodedToken)` in the application layer; consumed
 * by guards, decorators, and handlers throughout the codebase.
 *
 * This is the canonical value object that travels on `request.user` after
 * `JwtAuthGuard` succeeds.
 *
 * Introduced by the `auth-usuarios` change as Task 5 of the implementation.
 */
export interface AuthContext {
  /** Verified Firebase Auth UID of the caller. */
  uid: string;
  /** Caller's verified email. */
  email: string;
  /** Resolved `rol` (custom claim or Firestore fallback). */
  rol: import("./rol.enum").Rol;

  // NOTE (change auth-usuarios-v2): `placeId` was REMOVED from AuthContext.
  // The user→place relation is resolved via a `places` query by `usuarioId`.
}
