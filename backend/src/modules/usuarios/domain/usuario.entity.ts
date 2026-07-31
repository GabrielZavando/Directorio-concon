/**
 * Core Usuario entity — pure TypeScript, zero framework deps.
 *
 * Matches docs/data-model.md §usuarios exactly. Timestamps use `Date` in
 * the domain layer; the Firestore adapter converts ↔ Firestore.Timestamp.
 *
 * The `Rol` enum is defined in the `auth` module — the canonical home for
 * authentication + authorization concepts — and is imported via
 * `../../auth/domain/rol.enum`. `usuarios` consumes the type; it does
 * not own it (DIP: security concern lives in `auth`, business concern
 * depends on it).
 *
 * Invariants (enforced by `UsuariosService`, not by the type-system):
 * - `placeId` is REQUIRED when `rol === 'owner'`; MUST be `null`/omitted
 *   for `'admin'` and `'member'` (the service validates before persisting).
 * - `email` is UNIQUE across the collection (the service checks
 *   `findByEmail` before `create`).
 * - Default `rol: 'member'` on registration (per docs/data-model.md §usuarios).
 *
 * This change (`auth-usuarios`) only assembles the module; no Firebase Auth
 * users exist yet without a matching `usuarios` document — orphans get `403`
 * from `JwtAuthGuard` at runtime, NOT here in the entity layer.
 */
import type { Rol } from "../../auth/domain/rol.enum";

export interface Usuario {
  // -- Identity --
  /** Firebase Auth UID (PK); same value as `firebase.auth().currentUser.uid`. */
  id: string;

  /** UNIQUE email. Validated server-side on create. */
  email: string;

  /** Display name (2..100 characters). */
  nombre: string;

  /** Controlled enum: `'admin' | 'owner' | 'member'`. Default `'member'`. */
  rol: Rol;

  /**
   * Reference to the `places` document the user owns.
   *
   * Present when and only when `rol === 'owner'`. MUST be `null` / omitted
   * for `'admin'` and `'member'`. Enforced by `UsuariosService.create` /
   * `usuariosService.updateRol` before persistence.
   */
  placeId?: string | null;

  /** Chilean-format phone (free string). Optional. */
  telefono?: string | null;

  // -- Timestamps --
  /** Document creation timestamp. Set by the repository on create. */
  createdAt: Date;

  /** Last modification timestamp. Refreshed by the repository on every update. */
  updatedAt: Date;
}
