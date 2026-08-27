/**
 * Port (DIP) for the notification side-effect triggered when an admin-verified
 * evento is edited (reverted to `pendiente`). The concrete implementation
 * (Email + In-App) lands in change CH-06 `notificaciones`; for CH-04 we ship a
 * no-op adapter so the EventosService stays decoupled from the notification
 * infrastructure.
 */
import type { Evento } from "../domain/evento.entity";
import type { CambioEvento } from "../domain/cambio-evento.interface";

export const NOTIFICACIONES_PORT = "NOTIFICACIONES_PORT";

export interface NotificacionesPort {
  /**
   * Notify that a previously-verified evento was reverted to `pendiente`
   * because of an owner/admin edit. `cambios` is the diff recorded for the edit.
   */
  notifyEventoRevertidoPendiente(
    evento: Evento,
    cambios: CambioEvento[],
  ): Promise<void>;
}
