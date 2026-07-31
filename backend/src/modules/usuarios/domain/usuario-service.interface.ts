/**
 * Service interface for Usuario domain operations — used by the
 * `UsuariosController` (Task 4) for inversion of control.
 *
 * The controller depends on THIS interface (via `@Inject(USUARIOS_SERVICE)`)
 * rather than the concrete `UsuariosService` class, keeping the
 * infrastructure HTTP layer decoupled from the application service
 * implementation. Mirrors the pattern of `SolicitudesServiceInterface` in
 * the `solicitudes` module.
 *
 * Placed in `domain/` (not `application/`) per the `auth-usuarios` change's
 * `tasks.md` Task 2.4: it is a pure domain contract defining what the
 * service does, not how (`UsuariosService` lives in `application/`).
 *
 * Pure TypeScript, zero framework imports.
 */
import type { Usuario } from "./usuario.entity";
import type { Rol } from "../../auth/domain/rol.enum";
import type {
  PaginatedUsuarios,
  UsuarioSearchFilters,
} from "./usuario-repository.interface";

/** Input for the admin-only `create` operation (POST /usuarios). */
export interface CreateUsuarioInput {
  /** Firebase Auth UID — REQUIRED (the Firebase Auth user is created client-side; this provision writes the matching `usuarios` row). */
  id: string;
  email: string;
  nombre: string;
  /** Defaults to `'member'` if omitted (per `docs/data-model.md §usuarios`). */
  rol?: Rol;
  /** Optional; MUST be omitted when `rol !== 'owner'`. */
  placeId?: string | null;
  telefono?: string | null;
}

/** Input for the self-service `PUT /usuarios/me` operation. */
export interface UpdatePerfilInput {
  nombre?: string;
  telefono?: string | null;
}

export interface UsuariosServiceInterface {
  // -- Self service (`GET /usuarios/me`, `PUT /usuarios/me`) --
  /** Get the authenticated caller's own `usuarios` document. */
  getMe(uid: string): Promise<Usuario>;

  /** Self-update `nombre` and `telefono` only (refuses `rol` / `placeId`). */
  updatePerfil(uid: string, patch: UpdatePerfilInput): Promise<Usuario>;

  // -- Admin operations (`POST /usuarios`, `GET /usuarios`, `GET /usuarios/:uid`, `PUT /usuarios/:uid/rol`) --
  /** Provision a new `usuarios` document. Rejects duplicate `email` with `ConflictException` (application layer). */
  create(input: CreateUsuarioInput): Promise<Usuario>;

  /** Admin-only listing with optional `rol` filter + pagination. */
  findAll(adminFilters: UsuarioSearchFilters): Promise<PaginatedUsuarios>;

  /** Admin-only lookup of any user by UID. */
  findById(uid: string): Promise<Usuario>;

  /** Admin-only mutation of a user's `rol`. Cascades `linkPlaceId` cleanup when transitioning out of `'owner'`. */
  updateRol(uid: string, rol: Rol): Promise<Usuario>;
}
