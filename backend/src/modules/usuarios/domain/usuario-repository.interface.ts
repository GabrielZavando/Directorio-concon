/**
 * Repository interfaces for the Usuario aggregate.
 *
 * Split into read + write segregated interfaces (ISP: ≤ 5 methods each) and
 * a combined `UsuarioRepositoryInterface` for the service to depend on.
 *
 * DIP: the `usuarios` application layer (`UsuariosService`) imports THESE
 * interfaces only — never the concrete Firestore adapter. The adapter
 * (lives in `infrastructure/usuarios-firestore.adapter.ts`) implements
 * `UsuarioRepositoryInterface` and is bound via the `USUARIOS_REPOSITORY`
 * token at module wiring time.
 *
 * Pure TypeScript, zero framework imports. `class-validator` and
 * `firebase-admin` MUST NOT appear here.
 */
import type { Usuario } from "./usuario.entity";

// ---------------------------------------------------------------------------
// Filters + paginated result
// ---------------------------------------------------------------------------

/** Filters for the admin-only list endpoint (GET /usuarios). */
export interface UsuarioSearchFilters {
  /** Optional filter by `rol`. When omitted, all `rol` values are returned. */
  rol?: Usuario["rol"];

  /** Cursor-based pagination (Firestore). 1-based for the response meta. */
  page?: number;

  /** Page size. Defaults to 20 in the service. */
  limit?: number;
}

/**
 * Paginated result from Firestore cursor-based pagination.
 *
 * Mirrors `PaginatedEventos` in the `eventos` module for contract symmetry:
 * `data` is the current page, `total` is the matching document count, and
 * the optional `nextCursor` lets the client fetch the next page.
 */
export interface PaginatedUsuarios {
  data: Usuario[];
  /** Cursor pointing to the next page. `undefined` when there are no more pages. */
  nextCursor?: string;
  /** Total matching documents (for the admin UI's "N results" indicator). */
  total: number;
}

// ---------------------------------------------------------------------------
// Read interface (≤ 3 methods — ISP)
// ---------------------------------------------------------------------------
export interface UsuarioReadRepositoryInterface {
  /** Look up a `usuarios` document by its PK (the Firebase Auth UID). */
  findById(uid: string): Promise<Usuario | null>;

  /** Look up by UNIQUE email. Used by `create` for the uniqueness check. */
  findByEmail(email: string): Promise<Usuario | null>;

  /** Admin-only paginated listing with optional `rol` filter. */
  findAll(filters: UsuarioSearchFilters): Promise<PaginatedUsuarios>;
}

// ---------------------------------------------------------------------------
// Write interface (≤ 4 methods — ISP)
// ---------------------------------------------------------------------------
export interface UsuarioWriteRepositoryInterface {
  /**
   * Insert a new `usuarios` document. The `id` (Firebase Auth UID) is
   * provided by the caller (admin-provisioning flow); the repository
   * stamps `createdAt` and `updatedAt`.
   */
  create(usuario: Omit<Usuario, "createdAt" | "updatedAt">): Promise<Usuario>;

  /**
   * Self-service profile update. The repository accepts ONLY `nombre` and
   * `telefono` and refuses any other field (the `forbidNonWhitelisted`
   * validation happens at the controller; the repository is a defensive
   * last-mile accept — it cannot mutate `rol` or `placeId` via this method).
   */
  updatePerfil(
    uid: string,
    patch: Pick<Usuario, "nombre" | "telefono">,
  ): Promise<Usuario>;

  /**
   * Admin-only mutation of `rol`. The repository writes only `rol`+
   * `updatedAt` (it MUST NOT accept the full `Usuario` shape here —
   * defensive SRP).
   */
  updateRol(uid: string, rol: Usuario["rol"]): Promise<Usuario>;
}

// ---------------------------------------------------------------------------
// Combined interface (convenience for the service)
// ---------------------------------------------------------------------------
export interface UsuarioRepositoryInterface
  extends UsuarioReadRepositoryInterface,
    UsuarioWriteRepositoryInterface {}
