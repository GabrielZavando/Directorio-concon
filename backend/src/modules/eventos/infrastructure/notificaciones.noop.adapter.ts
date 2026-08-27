/**
 * No-op implementation of NotificacionesPort for CH-04.
 *
 * The real Email + In-App notification logic is implemented in change CH-06
 * `notificaciones` and wired here by replacing this provider. Keeping a no-op
 * adapter now lets EventosService depend on the port (DIP) without coupling to
 * notification infrastructure that does not exist yet.
 */
import { Injectable } from "@nestjs/common";
import type { Evento } from "../domain/evento.entity";
import type { CambioEvento } from "../domain/cambio-evento.interface";
import type { NotificacionesPort } from "../application/notificaciones.port";

@Injectable()
export class NoopNotificacionesAdapter implements NotificacionesPort {
  async notifyEventoRevertidoPendiente(
    _evento: Evento,
    _cambios: CambioEvento[],
  ): Promise<void> {
    // No-op: notification delivery is implemented in CH-06.
  }
}
