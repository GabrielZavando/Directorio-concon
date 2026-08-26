/**
 * Application service for the Solicitud aggregate.
 *
 * Handles solicitud lifecycle: creation, approval, rejection.
 * Uses injected approval handlers (DIP) for updating associated entities.
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
import type { Solicitud } from "../domain/solicitud.entity";
import type {
  SolicitudesServiceInterface,
  CreateEventoSolicitudInput,
} from "./solicitudes-service.interface";
import type {
  EventoApprovalHandler,
  PlaceApprovalHandler,
} from "./approval-handlers";
import {
  EVENTO_APPROVAL_HANDLER,
  PLACE_APPROVAL_HANDLER,
} from "./approval-handlers";

/** Domain message for the XOR invariant (placeId ⊕ eventoId, exactly one). */
const XOR_REFERENCE_MESSAGE =
  "Una solicitud debe referenciar exactamente un placeId o eventoId (XOR)";

const EVENTO_HANDLER_MISSING = "EventoApprovalHandler no está configurado";

@Injectable()
export class SolicitudesService implements SolicitudesServiceInterface {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    @Inject(SOLICITUDES_REPOSITORY)
    private readonly repo: SolicitudesRepositoryInterface,
    @Optional()
    @Inject(EVENTO_APPROVAL_HANDLER)
    private readonly eventoHandler?: EventoApprovalHandler,
    @Optional()
    @Inject(PLACE_APPROVAL_HANDLER)
    private readonly placeHandler?: PlaceApprovalHandler,
  ) {}

  private assertXorConstraint(input: {
    placeId?: string;
    eventoId?: string;
    tipo: Solicitud["tipo"];
  }): void {
    const hasPlaceId = input.placeId !== undefined;
    const hasEventoId = input.eventoId !== undefined;
    const isEventoTipo = input.tipo.endsWith("-evento");
    const exactlyOneReference = hasPlaceId !== hasEventoId;
    const referenceMatchesTipo = hasPlaceId === !isEventoTipo;
    if (!exactlyOneReference || !referenceMatchesTipo) {
      throw new BadRequestException(XOR_REFERENCE_MESSAGE);
    }
  }

  // -------------------------------------------------------------------------
  // Create (used by places service — via SolicitudesRepositoryInterface)
  // -------------------------------------------------------------------------

  /** Create a solicitud for a place (tipo: 'registro' | 'actualizacion'). */
  async create(input: {
    placeId?: string;
    eventoId?: string;
    usuarioId: string;
    tipo: Solicitud["tipo"];
    status: "pendiente";
    createdAt: Date;
  }): Promise<Solicitud> {
    this.assertXorConstraint(input);
    return this.repo.create(input);
  }

  /** Check if a place has pending solicitudes. */
  async existsByPlaceId(placeId: string): Promise<boolean> {
    return this.repo.existsByPlaceId(placeId);
  }

  // -------------------------------------------------------------------------
  // Create (used by eventos service — via SolicitudesServiceInterface)
  // -------------------------------------------------------------------------

  /** Create a solicitud for an evento (tipo: 'registro-evento' | 'actualizacion-evento'). */
  async createEventoSolicitud(
    input: CreateEventoSolicitudInput,
  ): Promise<{ id: string }> {
    this.assertXorConstraint(input);
    const solicitud = await this.repo.create(input);
    return { id: solicitud.id };
  }

  /** Check if an evento has pending solicitudes. */
  async existsPendingByEventoId(eventoId: string): Promise<boolean> {
    return this.repo.existsPendingByEventoId(eventoId);
  }

  // -------------------------------------------------------------------------
  // Approval / Rejection
  // -------------------------------------------------------------------------

  /**
   * Approve a solicitud.
   * - 'registro-evento': approves the associated evento
   * - 'actualizacion-evento': applies the proposal to the evento
   * - 'registro': approves the associated place
   * - 'actualizacion': (future) applies changes to the place — not yet implemented
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
    switch (solicitud.tipo) {
      case "registro-evento":
        if (!this.eventoHandler) {
          throw new Error(EVENTO_HANDLER_MISSING);
        }
        await this.eventoHandler.approveRegistro(solicitud.eventoId!, adminUid);
        break;
      case "actualizacion-evento":
        if (!this.eventoHandler) {
          throw new Error(EVENTO_HANDLER_MISSING);
        }
        await this.eventoHandler.applyProposal(
          solicitud.eventoId!,
          solicitud.proposal ?? {},
        );
        break;
      case "registro":
        if (!this.placeHandler) {
          throw new Error("PlaceApprovalHandler no está configurado");
        }
        await this.placeHandler.approveRegistro(solicitud.placeId!, adminUid);
        break;
      case "reclamo-place":
        if (!this.placeHandler) {
          throw new Error("PlaceApprovalHandler no está configurado");
        }
        await this.placeHandler.approveReclamo(
          solicitud.placeId!,
          solicitud.solicitanteUid!,
          adminUid,
        );
        break;
      case "actualizacion":
        // Place update approval — not yet implemented
        this.logger.warn(
          `Aprobación de actualización de place no implementada (solicitud ${solicitud.id})`,
        );
        break;
    }
  }

  /**
   * Reject a solicitud.
   * - 'registro-evento': rejects the associated evento
   * - 'actualizacion-evento': no-op (evento stays unchanged)
   * - 'registro': (future) rejects the associated place — not yet implemented
   * - 'actualizacion': no-op (place stays unchanged)
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

    switch (solicitud.tipo) {
      case "registro-evento":
        if (!this.eventoHandler) {
          throw new Error(EVENTO_HANDLER_MISSING);
        }
        await this.eventoHandler.rejectRegistro(solicitud.eventoId!, adminUid);
        break;
      case "actualizacion-evento":
        // No-op: evento stays unchanged on rejection
        this.logger.log(
          `Solicitud ${id} (actualizacion-evento) rechazada — evento sin cambios`,
        );
        break;
      case "registro":
        // Place rejection — not yet implemented
        this.logger.warn(`Rechazo de place no implementado (solicitud ${id})`);
        break;
      case "reclamo-place":
        if (!this.placeHandler) {
          throw new Error("PlaceApprovalHandler no está configurado");
        }
        await this.placeHandler.rejectReclamo(
          solicitud.placeId!,
          solicitud.id,
          adminUid,
        );
        break;
      case "actualizacion":
        // No-op: place stays unchanged on rejection
        this.logger.log(
          `Solicitud ${id} (actualizacion) rechazada — place sin cambios`,
        );
        break;
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
