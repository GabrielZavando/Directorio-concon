/**
 * Interface for the role-lookup adapter (read-only).
 *
 * Pure TypeScript (DIP). Implemented by `UsuariosRolLookupAdapter` (Task 6
 * of the `auth-usuarios` change). The fallback path of `AuthService.buildContext`
 * uses this to resolve a `Rol` from Firestore when the Firebase custom claim
 * is absent.
 */
export interface AuthContextRepository {
  /** Returns the `Rol` for the given uid, or `undefined` if not provisioned. */
  getRolByUid(uid: string): Promise<import("./rol.enum").Rol | undefined>;

  /** Creates a `usuarios` document for a newly registered user. */
  createUsuario(data: {
    uid: string;
    email: string;
    nombre: string;
    rol: import("./rol.enum").Rol;
  }): Promise<void>;
}
