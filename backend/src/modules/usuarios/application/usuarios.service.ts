/**
 * Application service for the Usuario aggregate.
 *
 * Orchestrates business rules + delegates persistence to the
 * `UsuarioRepositoryInterface` (DIP — the adapter is injected via the
 * `USUARIOS_REPOSITORY` token at module wiring time).
 *
 * Implements `UsuariosServiceInterface` from `domain/usuario-service.interface.ts`
 * — the controller depends on the interface (IOC), not on this concrete class.
 *
 * SRP — this service does ONLY business logic + validation. Cross-field
 * invariants (e.g., `placeId` ↔ `rol === 'owner'`) and conflict detection
 * live HERE; persistence and Date ↔ Timestamp mapping live in the adapter.
 *
 * Throws:
 * - `ConflictException` (`409`) — duplicate `email` on create.
 * - `NotFoundException` (`404`) — `usuarios` document missing.
 * - `BadRequestException` (`400`) — cross-field invariant violations
 *   (`placeId` ↔ `rol`) and enum validation (`rol` not in `ROL_VALUES`).
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ROL_VALUES, type Rol } from "../../auth/domain/rol.enum";
import { USUARIOS_REPOSITORY } from "../domain/usuario-repository.token";
import type {
  UsuarioRepositoryInterface,
  UsuarioSearchFilters,
  PaginatedUsuarios,
} from "../domain/usuario-repository.interface";
import type { Usuario } from "../domain/usuario.entity";
import type {
  CreateUsuarioInput,
  UpdatePerfilInput,
  UsuariosServiceInterface,
} from "../domain/usuario-service.interface";

@Injectable()
export class UsuariosService implements UsuariosServiceInterface {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @Inject(USUARIOS_REPOSITORY)
    private readonly repo: UsuarioRepositoryInterface,
  ) {}

  // -------------------------------------------------------------------------
  // Self service
  // -------------------------------------------------------------------------

  async getMe(uid: string): Promise<Usuario> {
    const me = await this.repo.findById(uid);
    if (!me) {
      throw new NotFoundException(
        `No usuarios document for uid '${uid}' (orphan — needs admin provisioning)`,
      );
    }
    return me;
  }

  async updatePerfil(uid: string, patch: UpdatePerfilInput): Promise<Usuario> {
    await this.assertExists(uid);
    // Defense-in-depth: the DTO + forbidNonWhitelisted already reject
    // `rol`/`placeId`, but the service layer enforces the same contract
    // so a future refactor cannot accidentally leak them.
    const sanitized: Pick<Usuario, "nombre" | "telefono"> = {
      nombre: patch.nombre,
      telefono: patch.telefono,
    };
    return this.repo.updatePerfil(uid, sanitized);
  }

  // -------------------------------------------------------------------------
  // Admin operations
  // -------------------------------------------------------------------------

  async create(input: CreateUsuarioInput): Promise<Usuario> {
    const rol: Rol = input.rol ?? "member";
    this.assertRolPlaceIdInvariant(rol, input.placeId);

    // Uniqueness check (UNIQUE email). The persistence layer does NOT enforce
    // this — Firestore single-field indexes are automatic; the app side is
    // the only authoritative gate.
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new ConflictException(
        `A usuarios document with email '${input.email}' already exists`,
      );
    }

    return this.repo.create({
      id: input.id,
      email: input.email,
      nombre: input.nombre,
      rol,
      placeId: input.placeId ?? null,
      telefono: input.telefono ?? null,
    });
  }

  async findAll(
    adminFilters: UsuarioSearchFilters,
  ): Promise<PaginatedUsuarios> {
    return this.repo.findAll(adminFilters);
  }

  async findById(uid: string): Promise<Usuario> {
    const found = await this.repo.findById(uid);
    if (!found) {
      throw new NotFoundException(`Usuario '${uid}' not found`);
    }
    return found;
  }

  async updateRol(uid: string, rol: Rol): Promise<Usuario> {
    if (!ROL_VALUES.includes(rol)) {
      throw new BadRequestException(
        `rol must be one of: ${ROL_VALUES.join(", ")}`,
      );
    }
    const current = await this.assertExists(uid);
    const updated = await this.repo.updateRol(uid, rol);
    // Cascade: when transitioning OUT of 'owner', unbind `placeId` (the
    // spec invariant — `placeId` MUST be `null` for non-owners).
    if (current.rol === "owner" && rol !== "owner" && current.placeId) {
      this.logger.log(
        `Cascading linkPlaceId(null) for uid=${uid} on rol transition owner→${rol}`,
      );
      return this.repo.linkPlaceId(uid, null);
    }
    return updated;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * `placeId` MUST be omitted/null when `rol !== 'owner'`; MUST be present
   * (non-null) when `rol === 'owner'`. Enforced at the service boundary so
   * the controller + adapter do not need to duplicate the check.
   */
  private assertRolPlaceIdInvariant(rol: Rol, placeId?: string | null): void {
    if (rol === "owner" && !placeId) {
      throw new BadRequestException("placeId is required when rol is 'owner'");
    }
    if (rol !== "owner" && placeId) {
      throw new BadRequestException(
        "placeId is only allowed when rol is 'owner'",
      );
    }
  }

  /** Fetch + throw if missing. */
  private async assertExists(uid: string): Promise<Usuario> {
    const found = await this.repo.findById(uid);
    if (!found) {
      throw new NotFoundException(`Usuario '${uid}' not found`);
    }
    return found;
  }
}
