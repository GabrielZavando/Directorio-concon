/**
 * Application service for the Solicitud aggregate.
 *
 * Handles solicitud lifecycle: creation, approval, rejection, and the admin
 * queue listing. CH-05 (solicitudes-refactor): only `reclamo-place` remains.
 *
 * Depends (DIP) on `SolicitudesRepositoryInterface` and `PlaceApprovalHandler`
 * (concrete impl provided by the places module).
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { SolicitudesRepositoryInterface } from "../domain/solicitudes-repository.interface";
import { SOLICITUDES_REPOSITORY } from "../domain/solicitudes-repository.token";
import {
  SOLICITUD_TIPO_RECLAMO_PLACE,
  type Solicitud,
} from "../domain/solicitud.entity";
import type {
  SolicitudesServiceInterface,
  ListarSolicitudesFiltros,
  ListaSolicitudesResult,
} from "./solicitudes-service.interface";
import type { PlaceApprovalHandler } from "./approval-handlers";
import { PLACE_APPROVAL_HANDLER } from "./approval-handlers";

/** Message when a create input still carries the removed `eventoId` field. */
const CAMPO_REMOVIDO_CH05 =
  "El campo 'eventoId' ha sido removido en CH-05 solicitudes-refactor. Use placeId para solicitudes de tipo 'reclamo-place'.";

/** Message for invalid tipo in this phase. */
const TIPO_NO_PERMITIDO_MSG =
  "Tipo de solicitud no permitido en esta fase. Solo 'reclamo-place' es válido.";

@Injectable()
export class SolicitudesService implements SolicitudesServiceInterface {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    @Inject(SOLICITUDES_REPOSITORY)
    private readonly repo: SolicitudesRepositoryInterface,
    // Optional: the places module provides the concrete handler (places
    // imports solicitudes, but solicitudes does NOT import places — so the
    // handler may be absent in the solicitudes module's own DI context).
    @Optional()
    @Inject(PLACE_APPROVAL_HANDLER)
    private readonly placeHandler?: PlaceApprovalHandler,
  ) {}

  private requirePlaceHandler(): PlaceApprovalHandler {
    if (!this.placeHandler) {
      throw new Error("PlaceApprovalHandler no está configurado");
    }
    return this.placeHandler;
  }

  private assertOnlyReclamoPlace(input: {
    placeId?: string;
    eventoId?: string;
    tipo?: Solicitud["tipo"];
  }): asserts input is {
    placeId: string;
    tipo: typeof SOLICITUD_TIPO_RECLAMO_PLACE;
  } {
    if (input.eventoId !== undefined) {
      throw new BadRequestException(CAMPO_REMOVIDO_CH05);
    }
    if (input.tipo !== SOLICITUD_TIPO_RECLAMO_PLACE) {
      throw new BadRequestException(TIPO_NO_PERMITIDO_MSG);
    }
    if (input.placeId === undefined) {
      throw new BadRequestException(TIPO_NO_PERMITIDO_MSG);
    }
  }

  /**
   * Create a `reclamo-place` solicitud. Validates the CH-05 single-reference
   * invariant: `eventoId` is rejected as removed, `placeId` is required, and
   * only the `reclamo-place` tipo is accepted.
   */
  async create(input: {
    placeId: string;
    eventoId?: string;
    usuarioId: string;
    tipo: Solicitud["tipo"];
    status: "pendiente";
    solicitanteUid: string;
    createdAt: Date;
  }): Promise<Solicitud> {
    this.assertOnlyReclamoPlace(input);
    return this.repo.create(input);
  }

  /** Admin queue listing (GET /solicitudes) — only `reclamo-place`, paginated. */
  async listarSolicitudes(
    filtros: ListarSolicitudesFiltros,
  ): Promise<ListaSolicitudesResult> {
    const status = filtros.status ?? "pendiente";
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;

    const { items, total } = await this.repo.findPendingQueue(
      status,
      page,
      limit,
    );

    return { data: items, meta: { page, limit, total } };
  }

  // -------------------------------------------------------------------------
  // Approval / Rejection
  // -------------------------------------------------------------------------

  /**
   * Approve a solicitud.
   * - 'reclamo-place': assigns place.usuarioId = solicitanteUid and auto-rejects other pending reclamos same placeId.
   */
  async aprobarSolicitud(id: string, adminUid: string): Promise<Solicitud> {
    const solicitud = await this.repo.findById(id);
    if (!solicitud) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }
    if (solicitud.status !== "pendiente") {
      throw new ConflictException(`Solicitud ${id} ya fue ${solicitud.status}`);
    }

    await this.dispatchApproval(solicitud, adminUid);

    const now = new Date();
    const updated = await this.repo.update(id, {
      status: "aprobado",
      revisadoPor: adminUid,
      revisadoAt: now,
    });

    this.logger.log(`Solicitud ${id} aprobada por ${adminUid}`);
    return updated;
  }

  private async dispatchApproval(
    solicitud: Solicitud,
    adminUid: string,
  ): Promise<void> {
    if (solicitud.tipo === SOLICITUD_TIPO_RECLAMO_PLACE) {
      await this.requirePlaceHandler().approveReclamo(
        solicitud.placeId,
        solicitud.solicitanteUid,
        adminUid,
      );
    } else {
      this.logger.warn(
        `Aprobación de tipo ${solicitud.tipo} no implementada (solicitud ${solicitud.id})`,
      );
    }
  }

  /**
   * Reject a solicitud.
   * - 'reclamo-place': no-op on place, just marks solicitud as rejected.
   */
  async rechazarSolicitud(
    id: string,
    adminUid: string,
    comentarios?: string,
  ): Promise<Solicitud> {
    const solicitud = await this.repo.findById(id);
    if (!solicitud) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }
    if (solicitud.status !== "pendiente") {
      throw new ConflictException(`Solicitud ${id} ya fue ${solicitud.status}`);
    }

    const now = new Date();

    if (solicitud.tipo === SOLICITUD_TIPO_RECLAMO_PLACE) {
      await this.requirePlaceHandler().rejectReclamo(
        solicitud.placeId,
        solicitud.id,
        adminUid,
      );
    } else {
      this.logger.warn(
        `Rechazo de tipo ${solicitud.tipo} no implementado (solicitud ${solicitud.id})`,
      );
    }

    const updated = await this.repo.update(id, {
      status: "rechazado",
      comentarios: comentarios,
      revisadoPor: adminUid,
      revisadoAt: now,
    });

    this.logger.log(`Solicitud ${id} rechazada por ${adminUid}`);
    return updated;
  }
}
