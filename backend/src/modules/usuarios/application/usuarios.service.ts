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
 * SRP — this service does ONLY business logic + validation. The user→place
 * relation has a single source of truth: `places.usuarioId`. This service
 * no longer enforces `placeId`↔`rol` invariants (those were removed in
 * `auth-usuarios-v2`, CH-02).
 *
 * Throws:
 * - `ConflictException` (`409`) — duplicate `email` on create (if create
 *   endpoint were re-added).
 * - `NotFoundException` (`404`) — `usuarios` document missing.
 * - `BadRequestException` (`400`) — enum validation (`rol` not in `ROL_VALUES`).
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

  async findAll(
    adminFilters: UsuarioSearchFilters,
  ): Promise<PaginatedUsuarios> {
    return this.repo.findAll(adminFilters);
  }

  async findById(uid: string): Promise<Usuario> {
    return this.assertExists(uid);
  }

  async updateRol(uid: string, rol: Rol): Promise<Usuario> {
    if (!ROL_VALUES.includes(rol)) {
      throw new BadRequestException(
        `rol must be one of: ${ROL_VALUES.join(", ")}`,
      );
    }
    await this.assertExists(uid);
    return this.repo.updateRol(uid, rol);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Fetch + throw if missing. */
  private async assertExists(uid: string): Promise<Usuario> {
    const found = await this.repo.findById(uid);
    if (!found) {
      throw new NotFoundException(`Usuario '${uid}' not found`);
    }
    return found;
  }
}
