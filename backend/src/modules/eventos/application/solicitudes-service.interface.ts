/**
 * Interface for solicitudes operations needed by EventosService.
 *
 * The concrete implementation lives in the solicitudes module (Task 8).
 * This interface maintains DIP: EventosService depends on the abstraction.
 */
export interface CreateEventoSolicitudInput {
  eventoId: string;
  usuarioId: string;
  tipo: "registro-evento" | "actualizacion-evento";
  status: "pendiente";
  proposal?: Record<string, unknown>;
  createdAt: Date;
}

export interface SolicitudesServiceInterface {
  createEventoSolicitud(
    input: CreateEventoSolicitudInput,
  ): Promise<{ id: string }>;
  existsPendingByEventoId(eventoId: string): Promise<boolean>;
}
