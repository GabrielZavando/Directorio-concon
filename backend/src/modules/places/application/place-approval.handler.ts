/**
 * Implements PlaceApprovalHandler for the solicitudes module.
 * Updates place status during solicitud approval.
 */
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { PlaceApprovalHandler } from "../../solicitudes/application/approval-handlers";
import type { PlaceRepositoryInterface } from "../domain/place-repository.interface";
import { PLACE_REPOSITORY } from "../domain/place-repository.token";

@Injectable()
export class PlaceApprovalHandlerImpl implements PlaceApprovalHandler {
  private readonly logger = new Logger(PlaceApprovalHandlerImpl.name);

  constructor(
    @Inject(PLACE_REPOSITORY)
    private readonly placeRepo: PlaceRepositoryInterface,
  ) {}

  async approveRegistro(placeId: string, _adminUid: string): Promise<void> {
    await this.placeRepo.update(placeId, {
      status: "aprobado" as never,
    });
    this.logger.log(`Place ${placeId} approved via solicitud`);
  }
}
