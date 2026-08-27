/**
 * Unit tests for the no-op notificaciones adapter.
 */
import { NoopNotificacionesAdapter } from "./notificaciones.noop.adapter";
import type { Evento } from "../domain/evento.entity";
import type { CambioEvento } from "../domain/cambio-evento.interface";

describe("NoopNotificacionesAdapter", () => {
  it("resolves without side effects", async () => {
    const adapter = new NoopNotificacionesAdapter();
    const evento = { id: "e" } as unknown as Evento;
    const cambios: CambioEvento[] = [];
    await expect(
      adapter.notifyEventoRevertidoPendiente(evento, cambios),
    ).resolves.toBeUndefined();
  });
});
