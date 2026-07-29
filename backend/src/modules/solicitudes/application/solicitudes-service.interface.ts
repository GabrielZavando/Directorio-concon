/**
 * Interface for solicitudes operations needed by EventosService.
 *
 * This mirrors the interface in eventos/application/solicitudes-service.interface.ts
 * to avoid circular module dependencies. The SolicitudesService implements this.
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
