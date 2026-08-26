/**
 * Implements PlaceApprovalHandler for the solicitudes module.
 * Updates place status during solicitud approval.
 *
 * Updated by places-refactor (CH-03): approval now sets `activo=true`
 * + `estadoVerificacion='verificado'` instead of old `status='aprobado'`.
 * Added `approveReclamo` (transfer ownership + auto-reject other reclamos)
 * and `rejectReclamo` (no-op on place).
 */
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { PlaceApprovalHandler } from "../../solicitudes/application/approval-handlers";
import type { PlaceRepositoryInterface } from "../domain/place-repository.interface";
import type { SolicitudesRepositoryInterface } from "../domain/solicitudes-repository.interface";
import { PLACE_REPOSITORY } from "../domain/place-repository.token";
import { SOLICITUDES_REPOSITORY } from "../domain/solicitudes-repository.token";

@Injectable()
export class PlaceApprovalHandlerImpl implements PlaceApprovalHandler {
  private readonly logger = new Logger(PlaceApprovalHandlerImpl.name);

  constructor(
    @Inject(PLACE_REPOSITORY)
    private readonly placeRepo: PlaceRepositoryInterface,
    @Inject(SOLICITUDES_REPOSITORY)
    private readonly solicitudRepo: SolicitudesRepositoryInterface,
  ) {}

  async approveRegistro(placeId: string, adminUid: string): Promise<void> {
    await this.placeRepo.update(placeId, {
      activo: true,
      estadoVerificacion: "verificado",
      gestionadoPorAdmin: false,
      updatedAt: new Date(),
    });
    this.logger.log(`Place ${placeId} approved via solicitud by ${adminUid}`);
  }

  async approveReclamo(
    placeId: string,
    solicitanteUid: string,
    adminUid: string,
  ): Promise<void> {
    // Transfer ownership + deactivate admin management
    await this.placeRepo.update(placeId, {
      usuarioId: solicitanteUid,
      gestionadoPorAdmin: false,
      updatedAt: new Date(),
    });

    // Auto-reject all other pending reclamos for this place
    const pendingReclamos =
      await this.solicitudRepo.findPendingReclamosByPlaceId(placeId);
    for (const reclamo of pendingReclamos) {
      await this.solicitudRepo.update(reclamo.id, {
        status: "rechazado",
        comentarios: "Rechazado automáticamente: otro reclamo fue aprobado",
        revisadoPor: adminUid,
        revisadoAt: new Date(),
      });
    }

    this.logger.log(
      `Place ${placeId} ownership transferred to ${solicitanteUid} by ${adminUid}`,
    );
  }

  async rejectReclamo(
    placeId: string,
    solicitudId: string,
    adminUid: string,
  ): Promise<void> {
    // No side-effect on the place — just log
    this.logger.log(
      `Reclamo ${solicitudId} for place ${placeId} rejected by ${adminUid}`,
    );
  }
}
