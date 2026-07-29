/**
 * Domain entity for a Solicitud (approval request).
 *
 * Solicitudes are used for both places and eventos approval flows.
 * A solicitud references either placeId OR eventoId (XOR constraint).
 */
export interface Solicitud {
  id: string;
  placeId?: string;
  eventoId?: string;
  usuarioId: string;
  tipo:
    | "registro"
    | "actualizacion"
    | "registro-evento"
    | "actualizacion-evento";
  status: "pendiente" | "aprobado" | "rechazado";
  proposal?: Record<string, unknown>;
  comentarios?: string;
  revisadoPor?: string;
  createdAt: Date;
  revisadoAt?: Date;
}
