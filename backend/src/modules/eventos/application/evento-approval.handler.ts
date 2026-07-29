/**
 * Implements EventoApprovalHandler for the solicitudes module.
 * Updates evento status/state during solicitud approval/rejection.
 */
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { EventoApprovalHandler } from "../../solicitudes/application/approval-handlers";
import type { EventoRepositoryInterface } from "../domain/evento-repository.interface";
import { EVENTO_REPOSITORY } from "../domain/evento-repository.token";

@Injectable()
export class EventoApprovalHandlerImpl implements EventoApprovalHandler {
  private readonly logger = new Logger(EventoApprovalHandlerImpl.name);

  constructor(
    @Inject(EVENTO_REPOSITORY)
    private readonly eventoRepo: EventoRepositoryInterface,
  ) {}

  async approveRegistro(eventoId: string, _adminUid: string): Promise<void> {
    await this.eventoRepo.update(eventoId, {
      status: "aprobado",
      estado: "programado",
    } as never);
    this.logger.log(`Evento ${eventoId} approved via solicitud`);
  }

  async applyProposal(
    eventoId: string,
    proposal: Record<string, unknown>,
  ): Promise<void> {
    await this.eventoRepo.update(eventoId, proposal as never);
    this.logger.log(
      `Evento ${eventoId} updated via solicitud proposal: ${JSON.stringify(proposal)}`,
    );
  }

  async rejectRegistro(eventoId: string, _adminUid: string): Promise<void> {
    await this.eventoRepo.update(eventoId, {
      status: "rechazado",
    } as never);
    this.logger.log(`Evento ${eventoId} rejected via solicitud`);
  }
}
